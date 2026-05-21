export interface LabelPrintItem {
  name: string
  barcode: string
  price?: number | null
  copies: number
}

export interface LabelPrintPayload {
  items: LabelPrintItem[]
  /** Mapa código → imagen PNG en base64 (sin prefijo data:). */
  barcodeImages: Record<string, string>
}

export interface GeneratedBarcode {
  barcode: string
  /** true si no existía en productos */
  isUnique: boolean
}
