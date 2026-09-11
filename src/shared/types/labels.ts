export interface LabelPrintItem {
  name: string
  barcode: string
  price?: number | null
  copies: number
  /** Si se omite, se usa a4/size del payload o Configuración. */
  presetId?: string
  widthMm?: number
  heightMm?: number
}

export type LabelPrintMode = 'roll' | 'a4'

export interface LabelSizeOverride {
  presetId: string
  widthMm?: number
  heightMm?: number
}

export interface LabelPrintPayload {
  items: LabelPrintItem[]
  /** Mapa código → imagen PNG en base64 (sin prefijo data:). */
  barcodeImages: Record<string, string>
  /** Por defecto: rollo térmico. */
  mode?: LabelPrintMode
  /** Obligatorio si mode === 'a4' (printerName opcional en preview). */
  a4?: LabelA4PrintOptions
  /** Rollo: si se omite, se usa el tamaño de Configuración. */
  size?: LabelSizeOverride
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

export interface LabelPrintHistoryItem {
  id: number
  name: string
  barcode: string
  price: number | null
  copies: number
  presetId: string | null
  widthMm: number | null
  heightMm: number | null
}

export interface LabelPrintHistoryJob {
  id: number
  printedAt: string
  mode: LabelPrintMode
  labelCount: number
  itemCount: number
  sheets: number | null
  a4PresetId: string | null
  a4WidthMm: number | null
  a4HeightMm: number | null
  a4PrinterName: string | null
  items: LabelPrintHistoryItem[]
}

export interface LabelPrintHistorySummary {
  id: number
  printedAt: string
  mode: LabelPrintMode
  labelCount: number
  itemCount: number
  sheets: number | null
  presetId: string | null
  widthMm: number | null
  heightMm: number | null
  mixedSizes: boolean
  /** Primeros nombres para vista rápida */
  previewNames: string
}
