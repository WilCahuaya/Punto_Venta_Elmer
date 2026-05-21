import { existsSync } from 'fs'
import { getDatabase } from '../database/connection'
import { resolveImagePath } from '../utils/paths'
import { fromMoneyDb } from '../utils/money-db'
import { getSaleById, getSaleItems } from '../modules/sales/sales.repository'
import { formatMoney } from '@shared/lib/currency'

function getSetting(key: string, fallback = ''): string {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? fallback
}

export async function printSaleTicket(saleId: number): Promise<{ ok: boolean; error?: string }> {
  const db = getDatabase()
  const sale = getSaleById(db, saleId)
  if (!sale) return { ok: false, error: 'Venta no encontrada' }

  const items = getSaleItems(db, saleId)
  const companyName = getSetting('company_name', 'Punto de Venta')
  const companyAddress = getSetting('company_address', '')
  const currencySymbol = getSetting('currency_symbol', 'S/')
  const printerName = getSetting('printer_ticket', '')
  const logoPath = getSetting('company_logo_path', '')

  const fmt = (n: string) => formatMoney(fromMoneyDb(n), currencySymbol)

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PosPrinter } = require('electron-pos-printer') as {
      PosPrinter: {
        print: (data: unknown[], options: Record<string, unknown>) => Promise<void>
      }
    }

    const data: Record<string, unknown>[] = [
      {
        type: 'text',
        value: companyName,
        style: { fontWeight: '700', textAlign: 'center', fontSize: '16px' }
      }
    ]

    if (companyAddress) {
      data.push({
        type: 'text',
        value: companyAddress,
        style: { textAlign: 'center', fontSize: '10px' }
      })
    }

    if (logoPath && existsSync(resolveImagePath(logoPath))) {
      data.push({
        type: 'image',
        path: resolveImagePath(logoPath),
        position: 'center',
        width: 120,
        height: 60
      })
    }

    data.push(
      { type: 'text', value: '--------------------------------', style: { textAlign: 'center' } },
      {
        type: 'text',
        value: `Ticket: ${sale.ticket_number}`,
        style: { fontSize: '11px' }
      },
      {
        type: 'text',
        value: `Fecha: ${sale.created_at}`,
        style: { fontSize: '10px' }
      },
      { type: 'text', value: '--------------------------------', style: { textAlign: 'center' } }
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
      { type: 'text', value: '--------------------------------', style: { textAlign: 'center' } },
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
      {
        type: 'text',
        value: `TOTAL: ${fmt(sale.total)}`,
        style: { fontWeight: '700', fontSize: '14px' }
      },
      { type: 'text', value: `Pagó: ${fmt(sale.amount_paid)}`, style: { fontSize: '11px' } },
      { type: 'text', value: `Vuelto: ${fmt(sale.change_amount)}`, style: { fontSize: '11px' } },
      { type: 'text', value: '--------------------------------', style: { textAlign: 'center' } },
      {
        type: 'text',
        value: '¡Gracias por su compra!',
        style: { textAlign: 'center', fontSize: '11px' }
      }
    )

    await PosPrinter.print(data, {
      printerName: printerName || undefined,
      preview: false,
      width: '58mm',
      margin: '0 0 0 0',
      copies: 1,
      timeOutPerLine: 400,
      silent: true
    })

    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error de impresión'
    return { ok: false, error: msg }
  }
}

/** Ticket de prueba para configuración de impresora. */
export async function printTestTicket(): Promise<{ ok: boolean; error?: string }> {
  const companyName = getSetting('company_name', 'Punto de Venta')
  const companyAddress = getSetting('company_address', '')
  const currencySymbol = getSetting('currency_symbol', 'S/')
  const printerName = getSetting('printer_ticket', '')
  const logoPath = getSetting('company_logo_path', '')

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PosPrinter } = require('electron-pos-printer') as {
      PosPrinter: {
        print: (data: unknown[], options: Record<string, unknown>) => Promise<void>
      }
    }

    const data: Record<string, unknown>[] = [
      {
        type: 'text',
        value: companyName,
        style: { fontWeight: '700', textAlign: 'center', fontSize: '16px' }
      }
    ]

    if (companyAddress) {
      data.push({
        type: 'text',
        value: companyAddress,
        style: { textAlign: 'center', fontSize: '10px' }
      })
    }

    if (logoPath && existsSync(resolveImagePath(logoPath))) {
      data.push({
        type: 'image',
        path: resolveImagePath(logoPath),
        position: 'center',
        width: 120,
        height: 60
      })
    }

    const now = new Date().toLocaleString('es-PE')
    data.push(
      { type: 'text', value: '--------------------------------', style: { textAlign: 'center' } },
      {
        type: 'text',
        value: 'TICKET DE PRUEBA',
        style: { fontWeight: '700', textAlign: 'center', fontSize: '14px' }
      },
      { type: 'text', value: now, style: { textAlign: 'center', fontSize: '10px' } },
      { type: 'text', value: '--------------------------------', style: { textAlign: 'center' } },
      {
        type: 'text',
        value: 'Producto ejemplo',
        style: { fontWeight: '600', fontSize: '11px' }
      },
      {
        type: 'text',
        value: `  1 x ${formatMoney(10, currencySymbol)} = ${formatMoney(10, currencySymbol)}`,
        style: { fontSize: '10px' }
      },
      { type: 'text', value: '--------------------------------', style: { textAlign: 'center' } },
      {
        type: 'text',
        value: `TOTAL: ${formatMoney(10, currencySymbol)}`,
        style: { fontWeight: '700', fontSize: '14px' }
      },
      {
        type: 'text',
        value: 'Impresora configurada correctamente',
        style: { textAlign: 'center', fontSize: '10px' }
      }
    )

    await PosPrinter.print(data, {
      printerName: printerName || undefined,
      preview: false,
      width: '58mm',
      margin: '0 0 0 0',
      copies: 1,
      timeOutPerLine: 400,
      silent: true
    })

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error de impresión' }
  }
}
