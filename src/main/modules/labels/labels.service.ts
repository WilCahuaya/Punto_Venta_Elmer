import { mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import type { ApiResult } from '@shared/types/api'
import type { LabelPdfPreviewResult, LabelPrintPayload } from '@shared/types/labels'
import { formatMoney } from '@shared/lib/currency'
import { resolveLabelDimensions, type LabelDimensions } from '@shared/lib/thermal-print'
import { getDatabase } from '../../database/connection'
import {
  generateLabelsPdf,
  printLabels,
  printLabelsOnA4,
  type LabelPrintContent
} from '../../services/label-print.service'
import { getLabelDimensionsFromSettings } from '../../services/label-settings'
import { barcodeExists } from './labels.repository'

function getSetting(key: string, fallback = ''): string {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? fallback
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

function resolvePayloadDims(payload: LabelPrintPayload): {
  mode: 'roll' | 'a4'
  dims: LabelDimensions
} {
  const mode = payload.mode === 'a4' ? 'a4' : 'roll'
  const dims =
    mode === 'a4' && payload.a4
      ? resolveLabelDimensions({
          presetId: payload.a4.presetId,
          widthMm: payload.a4.widthMm,
          heightMm: payload.a4.heightMm,
          dpi: 300
        })
      : getLabelDimensionsFromSettings()
  return { mode, dims }
}

function buildContentsFromPayload(
  payload: LabelPrintPayload,
  companyName: string,
  currencySymbol: string
): { contents: LabelPrintContent[]; tempImages: string[]; error?: string } {
  const tempImages: string[] = []
  const contents: LabelPrintContent[] = []

  for (const item of payload.items) {
    const copies = Math.max(1, Math.min(500, Math.floor(item.copies)))
    const base64 = payload.barcodeImages[item.barcode]
    if (!base64) {
      return { contents: [], tempImages, error: `Falta imagen para código ${item.barcode}` }
    }

    const imagePath = writeTempPng(base64)
    tempImages.push(imagePath)

    const priceText =
      item.price != null && item.price > 0 ? formatMoney(item.price, currencySymbol) : null

    for (let c = 0; c < copies; c++) {
      contents.push({
        companyName,
        productName: item.name,
        priceText,
        barcodeCode: item.barcode,
        barcodeImagePath: imagePath
      })
    }
  }

  return { contents, tempImages }
}

function cleanupTempImages(paths: string[]): void {
  for (const path of paths) {
    try {
      unlinkSync(path)
    } catch {
      /* ignorar */
    }
  }
}

export async function printLabelsService(
  payload: LabelPrintPayload
): Promise<ApiResult<{ printed: number; sheets?: number }>> {
  if (!payload.items?.length) {
    return { ok: false, error: 'No hay etiquetas para imprimir' }
  }

  const { mode, dims } = resolvePayloadDims(payload)
  const printerLabels = getSetting('printer_labels', '')
  const printerTicket = getSetting('printer_ticket', '')
  const currencySymbol = getSetting('currency_symbol', 'S/')
  const companyName = getSetting('company_name', '').trim() || 'Punto de Venta'
  const printerForA4 = payload.a4?.printerName?.trim() ?? ''

  if (mode === 'a4' && !printerForA4) {
    return { ok: false, error: 'Seleccione una impresora para hoja A4' }
  }

  const built = buildContentsFromPayload(payload, companyName, currencySymbol)
  if (built.error) {
    cleanupTempImages(built.tempImages)
    return { ok: false, error: built.error }
  }

  try {
    if (mode === 'a4') {
      const result = await printLabelsOnA4(built.contents, printerForA4, dims)
      return { ok: true, data: { printed: result.printed, sheets: result.sheets } }
    }

    await printLabels(built.contents, printerLabels, dims, printerTicket)
    return { ok: true, data: { printed: built.contents.length } }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Error al imprimir etiquetas'
    }
  } finally {
    cleanupTempImages(built.tempImages)
  }
}

export async function previewLabelsPdfService(
  payload: LabelPrintPayload
): Promise<ApiResult<LabelPdfPreviewResult>> {
  if (!payload.items?.length) {
    return { ok: false, error: 'No hay etiquetas para previsualizar' }
  }

  const { mode, dims } = resolvePayloadDims(payload)
  const currencySymbol = getSetting('currency_symbol', 'S/')
  const companyName = getSetting('company_name', '').trim() || 'Punto de Venta'

  const built = buildContentsFromPayload(payload, companyName, currencySymbol)
  if (built.error) {
    cleanupTempImages(built.tempImages)
    return { ok: false, error: built.error }
  }

  try {
    const { pdf, sheets } = await generateLabelsPdf(built.contents, dims, mode)
    return {
      ok: true,
      data: {
        pdfBase64: pdf.toString('base64'),
        labelCount: built.contents.length,
        sheets: mode === 'a4' ? sheets : undefined,
        widthMm: mode === 'a4' ? dims.widthMm : dims.widthMm,
        heightMm: mode === 'a4' ? dims.heightMm : dims.heightMm,
        mode
      }
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Error al generar vista previa'
    }
  } finally {
    cleanupTempImages(built.tempImages)
  }
}
