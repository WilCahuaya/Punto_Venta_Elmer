import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import type { ApiResult } from '@shared/types/api'
import type {
  GeneratedBarcode,
  LabelPrintItem,
  LabelPrintPayload
} from '@shared/types/labels'
import { formatMoney } from '@shared/lib/currency'
import { getDatabase } from '../../database/connection'
import { barcodeExists, generateCandidateBarcode } from './labels.repository'

function getSetting(key: string, fallback = ''): string {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? fallback
}

export function generateBarcodeService(): ApiResult<GeneratedBarcode> {
  const db = getDatabase()
  let barcode = ''
  let unique = false

  for (let i = 0; i < 50; i++) {
    const candidate = generateCandidateBarcode()
    if (!barcodeExists(db, candidate)) {
      barcode = candidate
      unique = true
      break
    }
  }

  if (!barcode) {
    return { ok: false, error: 'No se pudo generar un código único' }
  }

  return { ok: true, data: { barcode, isUnique: unique } }
}

export function checkBarcodeService(barcode: string): ApiResult<{ exists: boolean }> {
  const code = barcode.trim()
  if (!code) return { ok: false, error: 'Código vacío' }
  const db = getDatabase()
  return { ok: true, data: { exists: barcodeExists(db, code) } }
}

function writeTempPng(base64: string): string {
  const dir = join(tmpdir(), 'pos-labels')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${randomUUID()}.png`)
  writeFileSync(path, Buffer.from(base64, 'base64'))
  return path
}

export async function printLabelsService(
  payload: LabelPrintPayload
): Promise<ApiResult<{ printed: number }>> {
  if (!payload.items?.length) {
    return { ok: false, error: 'No hay etiquetas para imprimir' }
  }

  const printerName = getSetting('printer_labels', '') || getSetting('printer_ticket', '')
  const currencySymbol = getSetting('currency_symbol', 'S/')
  const companyName = getSetting('company_name', 'Mi Negocio')

  const printData: Record<string, unknown>[] = []
  let printed = 0

  for (const item of payload.items) {
    const copies = Math.max(1, Math.min(500, Math.floor(item.copies)))
    const base64 = payload.barcodeImages[item.barcode]
    if (!base64) {
      return { ok: false, error: `Falta imagen para código ${item.barcode}` }
    }

    const imagePath = writeTempPng(base64)

    for (let c = 0; c < copies; c++) {
      printData.push({
        type: 'text',
        value: companyName,
        style: { fontWeight: '600', textAlign: 'center', fontSize: '11px' }
      })
      printData.push({
        type: 'text',
        value: truncate(item.name, 28),
        style: { textAlign: 'center', fontSize: '12px', fontWeight: '700' }
      })
      if (item.price != null && item.price > 0) {
        printData.push({
          type: 'text',
          value: formatMoney(item.price, currencySymbol),
          style: { textAlign: 'center', fontSize: '14px', fontWeight: '700' }
        })
      }
      printData.push({
        type: 'image',
        path: imagePath,
        position: 'center',
        width: 180,
        height: 70
      })
      printData.push({
        type: 'text',
        value: item.barcode,
        style: { textAlign: 'center', fontSize: '10px', fontFamily: 'monospace' }
      })
      printData.push({
        type: 'text',
        value: ' ',
        style: { fontSize: '8px' }
      })
      printed++
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PosPrinter } = require('electron-pos-printer') as {
      PosPrinter: {
        print: (data: unknown[], options: Record<string, unknown>) => Promise<void>
      }
    }

    await PosPrinter.print(printData, {
      printerName: printerName || undefined,
      preview: false,
      width: '58mm',
      margin: '0 0 0 0',
      copies: 1,
      timeOutPerLine: 400,
      silent: true
    })

    return { ok: true, data: { printed } }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Error al imprimir etiquetas'
    }
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
