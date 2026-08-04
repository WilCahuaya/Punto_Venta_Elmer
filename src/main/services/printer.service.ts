import { existsSync } from 'fs'
import { getDatabase } from '../database/connection'
import { resolveImagePath } from '../utils/paths'
import { fromMoneyDb } from '../utils/money-db'
import { getSaleById, getSaleItems } from '../modules/sales/sales.repository'
import { formatMoney } from '@shared/lib/currency'
import {
  parseThermalPaperSize,
  type PosPrintLine,
  type ThermalPaperSize
} from './pos-print-options'
import { printThermalLines } from './thermal-print.service'
import {
  disposePreparedTicketLogo,
  escPosDotsToCssPx,
  getPaperAndLogoPercent,
  prepareTicketLogoForPrint,
  type PreparedTicketLogo
} from './ticket-logo'

/** Caracteres por línea (fuente normal ESC/POS / ticket). */
const TICKET_CHARS: Record<ThermalPaperSize, number> = {
  '58mm': 32,
  '80mm': 48
}

function getSetting(key: string, fallback = ''): string {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? fallback
}

function getPrintContext(): ReturnType<typeof getPaperAndLogoPercent> {
  return getPaperAndLogoPercent(
    getSetting('printer_paper_width', '58mm'),
    getSetting('ticket_logo_width_percent', '65')
  )
}

async function posPrint(data: PosPrintLine[], printerName: string): Promise<string> {
  const paper = parseThermalPaperSize(getSetting('printer_paper_width', '58mm'))
  const result = await printThermalLines(data, printerName, paper)
  return result.method
}

function ticketWidth(paper: ThermalPaperSize): number {
  return TICKET_CHARS[paper]
}

function separatorLine(paper: ThermalPaperSize): PosPrintLine {
  return {
    type: 'text',
    value: '-'.repeat(ticketWidth(paper)),
    style: { textAlign: 'center', fontSize: '10px' }
  }
}

function padRow(left: string, right: string, width: number): string {
  const l = left.trim()
  const r = right.trim()
  const space = width - l.length - r.length
  if (space < 1) {
    const maxLeft = Math.max(4, width - r.length - 1)
    return `${l.slice(0, maxLeft)} ${r}`.slice(0, width)
  }
  return `${l}${' '.repeat(space)}${r}`
}

function wrapText(text: string, width: number): string[] {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/)
    let current = ''
    for (const word of words) {
      const piece = word.length > width ? word.slice(0, width) : word
      if (!current) {
        current = piece
        continue
      }
      if (`${current} ${piece}`.length <= width) {
        current = `${current} ${piece}`
      } else {
        lines.push(current)
        current = piece
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

function appendSlogan(data: PosPrintLine[], slogan: string, paper: ThermalPaperSize): void {
  const text = slogan.trim()
  if (!text) return
  data.push({ type: 'text', value: '', style: { fontSize: '10px' } })
  for (const line of wrapText(text, ticketWidth(paper))) {
    data.push(centerText(line, { fontSize: '10px' }))
  }
}

function centerText(text: string, style?: PosPrintLine['style']): PosPrintLine {
  return {
    type: 'text',
    value: text,
    style: { textAlign: 'center', fontSize: '11px', ...style }
  }
}

function appendTicketLogo(
  data: PosPrintLine[],
  prepared: PreparedTicketLogo | null,
  paper: ThermalPaperSize
): void {
  if (!prepared) return
  // PNG en dots ESC/POS; width/height en CSS para fallback GDI/HTML
  data.push({
    type: 'image',
    path: prepared.path,
    position: 'center',
    width: escPosDotsToCssPx(prepared.width, paper),
    height: escPosDotsToCssPx(prepared.height, paper)
  })
}

function buildTicketHeader(
  companyName: string,
  companyAddress: string,
  logoPath: string,
  ctx: ReturnType<typeof getPrintContext>
): { data: PosPrintLine[]; prepared: PreparedTicketLogo | null } {
  const data: PosPrintLine[] = []

  let prepared: PreparedTicketLogo | null = null
  if (logoPath && existsSync(resolveImagePath(logoPath))) {
    prepared = prepareTicketLogoForPrint(resolveImagePath(logoPath), ctx.paper, ctx.percent)
    appendTicketLogo(data, prepared, ctx.paper)
  }

  data.push(
    centerText(companyName, { fontWeight: '700', fontSize: '14px' })
  )

  if (companyAddress) {
    data.push(centerText(companyAddress, { fontSize: '10px' }))
  }

  return { data, prepared }
}

export async function printSaleTicket(
  saleId: number,
  printerOverride?: string
): Promise<{ ok: boolean; error?: string; method?: string }> {
  const db = getDatabase()
  const sale = getSaleById(db, saleId)
  if (!sale) return { ok: false, error: 'Venta no encontrada' }

  const items = getSaleItems(db, saleId)
  const companyName = getSetting('company_name', 'Punto de Venta')
  const companyAddress = getSetting('company_address', '')
  const currencySymbol = getSetting('currency_symbol', 'S/')
  const printerName = printerOverride?.trim() || getSetting('printer_ticket', '')
  const logoPath = getSetting('company_logo_path', '')
  const ticketSlogan = getSetting('ticket_slogan', '')
  const ctx = getPrintContext()
  const width = ticketWidth(ctx.paper)

  const fmt = (n: string) => formatMoney(fromMoneyDb(n), currencySymbol)
  const { data, prepared } = buildTicketHeader(companyName, companyAddress, logoPath, ctx)

  try {
    data.push(
      separatorLine(ctx.paper),
      {
        type: 'text',
        value: padRow('Ticket', sale.ticket_number, width),
        style: { fontSize: '11px' }
      },
      {
        type: 'text',
        value: padRow('Fecha', sale.created_at.replace('T', ' ').slice(0, 19), width),
        style: { fontSize: '10px' }
      },
      separatorLine(ctx.paper)
    )

    for (const item of items) {
      data.push({
        type: 'text',
        value: item.product_name,
        style: { fontWeight: '600', fontSize: '11px' }
      })
      data.push({
        type: 'text',
        value: padRow(
          `${item.quantity} x ${fmt(item.unit_price)}`,
          fmt(item.line_total),
          width
        ),
        style: { fontSize: '10px' }
      })
    }

    data.push(separatorLine(ctx.paper), {
      type: 'text',
      value: padRow('Subtotal', fmt(sale.subtotal), width),
      style: { fontSize: '11px' }
    })

    if (fromMoneyDb(sale.discount) > 0) {
      data.push({
        type: 'text',
        value: padRow('Descuento', fmt(sale.discount), width),
        style: { fontSize: '11px' }
      })
    }

    data.push(
      {
        type: 'text',
        value: padRow('TOTAL', fmt(sale.total), width),
        style: { fontWeight: '700', fontSize: '13px' }
      },
      {
        type: 'text',
        value: padRow('Pagó', fmt(sale.amount_paid), width),
        style: { fontSize: '11px' }
      },
      {
        type: 'text',
        value: padRow('Vuelto', fmt(sale.change_amount), width),
        style: { fontSize: '11px' }
      },
      separatorLine(ctx.paper),
      centerText('Gracias por su compra!', { fontSize: '11px' })
    )
    appendSlogan(data, ticketSlogan, ctx.paper)

    const method = await posPrint(data, printerName)
    return { ok: true, method }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error de impresión'
    return { ok: false, error: msg }
  } finally {
    disposePreparedTicketLogo(prepared)
  }
}

/** Ticket de prueba para configuración de impresora. */
export async function printTestTicket(): Promise<{ ok: boolean; error?: string; method?: string }> {
  const companyName = getSetting('company_name', 'Punto de Venta')
  const companyAddress = getSetting('company_address', '')
  const currencySymbol = getSetting('currency_symbol', 'S/')
  const printerName = getSetting('printer_ticket', '')
  const logoPath = getSetting('company_logo_path', '')
  const ticketSlogan = getSetting('ticket_slogan', '')
  const ctx = getPrintContext()
  const width = ticketWidth(ctx.paper)

  const { data, prepared } = buildTicketHeader(companyName, companyAddress, logoPath, ctx)

  try {
    const now = new Date().toLocaleString('es-PE')
    data.push(
      separatorLine(ctx.paper),
      centerText('TICKET DE PRUEBA', { fontWeight: '700', fontSize: '13px' }),
      centerText(now, { fontSize: '10px' }),
      separatorLine(ctx.paper),
      {
        type: 'text',
        value: 'Producto ejemplo',
        style: { fontWeight: '600', fontSize: '11px' }
      },
      {
        type: 'text',
        value: padRow(`1 x ${formatMoney(10, currencySymbol)}`, formatMoney(10, currencySymbol), width),
        style: { fontSize: '10px' }
      },
      separatorLine(ctx.paper),
      {
        type: 'text',
        value: padRow('TOTAL', formatMoney(10, currencySymbol), width),
        style: { fontWeight: '700', fontSize: '13px' }
      },
      centerText('Impresora configurada correctamente', { fontSize: '10px' }),
      centerText('Gracias por su compra!', { fontSize: '11px' })
    )
    appendSlogan(data, ticketSlogan, ctx.paper)

    const method = await posPrint(data, printerName)
    return { ok: true, method }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error de impresión' }
  } finally {
    disposePreparedTicketLogo(prepared)
  }
}
