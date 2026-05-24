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

import { generateCandidateBarcode } from '../../utils/barcode'

import { printLabel } from '../../services/label-print.service'
import { getLabelDimensionsFromSettings } from '../../services/label-settings'

import { barcodeExists } from './labels.repository'



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

    const candidate = generateCandidateBarcode(db)

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



  const printerLabels = getSetting('printer_labels', '')
  const printerTicket = getSetting('printer_ticket', '')
  const dims = getLabelDimensionsFromSettings()

  const currencySymbol = getSetting('currency_symbol', 'S/')

  const companyName = getSetting('company_name', '').trim() || 'Punto de Venta'



  let printed = 0



  try {

    for (const item of payload.items) {

      const copies = Math.max(1, Math.min(500, Math.floor(item.copies)))

      const base64 = payload.barcodeImages[item.barcode]

      if (!base64) {

        return { ok: false, error: `Falta imagen para código ${item.barcode}` }

      }



      const imagePath = writeTempPng(base64)

      const priceText =

        item.price != null && item.price > 0

          ? formatMoney(item.price, currencySymbol)

          : null



      for (let c = 0; c < copies; c++) {

        await printLabel(
          {
            companyName,
            productName: item.name,
            priceText,
            barcodeCode: item.barcode,
            barcodeImagePath: imagePath
          },
          printerLabels,
          dims,
          printerTicket
        )

        printed++

      }

    }



    return { ok: true, data: { printed } }

  } catch (e) {

    return {

      ok: false,

      error: e instanceof Error ? e.message : 'Error al imprimir etiquetas'

    }

  }

}


