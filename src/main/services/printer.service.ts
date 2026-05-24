import { existsSync } from 'fs'
import { getDatabase } from '../database/connection'
import { resolveImagePath } from '../utils/paths'
import { fromMoneyDb } from '../utils/money-db'
import { getSaleById, getSaleItems } from '../modules/sales/sales.repository'
import { formatMoney } from '@shared/lib/currency'
import { parseThermalPaperSize, type PosPrintLine } from './pos-print-options'
import { printThermalLines } from './thermal-print.service'
import {
  disposePreparedTicketLogo,
  getPaperAndLogoPercent,
  prepareTicketLogoForPrint,
  type PreparedTicketLogo
} from './ticket-logo'

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

function appendTicketLogo(data: PosPrintLine[], prepared: PreparedTicketLogo | null): void {
  if (!prepared) return
  data.push({
    type: 'image',
    path: prepared.path,
    position: 'center',
    width: prepared.width,
    height: prepared.height
  })
}

function buildTicketHeader(
  companyName: string,
  companyAddress: string,
  logoPath: string,
  ctx: ReturnType<typeof getPrintContext>
): { data: PosPrintLine[]; prepared: PreparedTicketLogo | null } {
  const data: PosPrintLine[] = [
    {
      type: 'text',
      value: companyName,
      style: { fontWeight: '700', textAlign: 'center', fontSize: '14px' }
    }
  ]

  if (companyAddress) {
    data.push({
      type: 'text',
      value: companyAddress,
      style: { textAlign: 'center', fontSize: '10px' }
    })
  }

  let prepared: PreparedTicketLogo | null = null
  if (logoPath && existsSync(resolveImagePath(logoPath))) {
    prepared = prepareTicketLogoForPrint(resolveImagePath(logoPath), ctx.paper, ctx.percent)
    appendTicketLogo(data, prepared)
  }

  return { data, prepared }
}

export async function printSaleTicket(saleId: number): Promise<{ ok: boolean; error?: string; method?: string }> {
  const db = getDatabase()
  const sale = getSaleById(db, saleId)
  if (!sale) return { ok: false, error: 'Venta no encontrada' }

  const items = getSaleItems(db, saleId)
  const companyName = getSetting('company_name', 'Punto de Venta')
  const companyAddress = getSetting('company_address', '')
  const currencySymbol = getSetting('currency_symbol', 'S/')
  const printerName = getSetting('printer_ticket', '')
  const logoPath = getSetting('company_logo_path', '')
  const ctx = getPrintContext()

  const fmt = (n: string) => formatMoney(fromMoneyDb(n), currencySymbol)
  const { data, prepared } = buildTicketHeader(companyName, companyAddress, logoPath, ctx)

  try {
    data.push(
      { type: 'text', value: '--------------------------------', style: { textAlign: 'center', fontSize: '10px' } },
      { type: 'text', value: `Ticket: ${sale.ticket_number}`, style: { fontSize: '11px' } },
      { type: 'text', value: `Fecha: ${sale.created_at}`, style: { fontSize: '10px' } },
      { type: 'text', value: '--------------------------------', style: { textAlign: 'center', fontSize: '10px' } }
    )

    for (const item of items) {
      data.push({
        type: 'text',
        value: `${item.product_name}`,
        style: { fontWeight: '600', fontSize: '11px' }
      })
      data.push({
        type: 'text',
        value: `  ${item.quantity} x ${fmt(item.unit_price)} = ${fmt(item.line_total)}`,
        style: { fontSize: '10px' }
      })
    }

    data.push(
      { type: 'text', value: '--------------------------------', style: { textAlign: 'center', fontSize: '10px' } },
      { type: 'text', value: `Subtotal: ${fmt(sale.subtotal)}`, style: { fontSize: '11px' } }
    )

    if (fromMoneyDb(sale.discount) > 0) {
      data.push({
        type: 'text',
        value: `Descuento: ${fmt(sale.discount)}`,
        style: { fontSize: '11px' }
      })
    }

    data.push(
      { type: 'text', value: `TOTAL: ${fmt(sale.total)}`, style: { fontWeight: '700', fontSize: '13px' } },
      { type: 'text', value: `Pagó: ${fmt(sale.amount_paid)}`, style: { fontSize: '11px' } },
      { type: 'text', value: `Vuelto: ${fmt(sale.change_amount)}`, style: { fontSize: '11px' } },
      { type: 'text', value: '--------------------------------', style: { textAlign: 'center', fontSize: '10px' } },
      { type: 'text', value: '¡Gracias por su compra!', style: { textAlign: 'center', fontSize: '11px' } }
    )

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
  const ctx = getPrintContext()

  const { data, prepared } = buildTicketHeader(companyName, companyAddress, logoPath, ctx)

  try {
    const now = new Date().toLocaleString('es-PE')
    data.push(
      { type: 'text', value: '--------------------------------', style: { textAlign: 'center', fontSize: '10px' } },
      { type: 'text', value: 'TICKET DE PRUEBA', style: { fontWeight: '700', textAlign: 'center', fontSize: '13px' } },
      { type: 'text', value: now, style: { textAlign: 'center', fontSize: '10px' } },
      { type: 'text', value: '--------------------------------', style: { textAlign: 'center', fontSize: '10px' } },
      { type: 'text', value: 'Producto ejemplo', style: { fontWeight: '600', fontSize: '11px' } },
      {
        type: 'text',
        value: `  1 x ${formatMoney(10, currencySymbol)} = ${formatMoney(10, currencySymbol)}`,
        style: { fontSize: '10px' }
      },
      { type: 'text', value: '--------------------------------', style: { textAlign: 'center', fontSize: '10px' } },
      { type: 'text', value: `TOTAL: ${formatMoney(10, currencySymbol)}`, style: { fontWeight: '700', fontSize: '13px' } },
      { type: 'text', value: 'Impresora configurada correctamente', style: { textAlign: 'center', fontSize: '10px' } }
    )

    const method = await posPrint(data, printerName)
    return { ok: true, method }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error de impresión' }
  } finally {
    disposePreparedTicketLogo(prepared)
  }
}
