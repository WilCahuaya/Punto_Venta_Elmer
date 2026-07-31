export interface LabelPrintItem {
  name: string
  barcode: string
  price?: number | null
  copies: number
}

export type LabelPrintMode = 'roll' | 'a4'

export interface LabelPrintPayload {
  items: LabelPrintItem[]
  /** Mapa código → imagen PNG en base64 (sin prefijo data:). */
  barcodeImages: Record<string, string>
  /** Por defecto: rollo térmico. */
  mode?: LabelPrintMode
  /** Obligatorio si mode === 'a4' (printerName opcional en preview). */
  a4?: LabelA4PrintOptions
}

export interface LabelA4PrintOptions {
  presetId: string
  widthMm?: number
  heightMm?: number
  /** Impresora elegida en el modal A4 (láser/PDF). Opcional en vista previa. */
  printerName?: string
}

export interface LabelPdfPreviewResult {
  pdfBase64: string
  labelCount: number
  sheets?: number
  widthMm: number
  heightMm: number
  mode: LabelPrintMode
}
