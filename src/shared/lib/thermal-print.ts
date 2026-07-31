/** Ancho de rollo térmico para tickets (POS). */
export type ThermalPaperSize = '58mm' | '80mm'

/** Ancho en píxeles lógicos (~203 DPI) para electron-pos-printer / ventana HTML. */
export const TICKET_WIDTH_PX: Record<ThermalPaperSize, number> = {
  '58mm': 219,
  '80mm': 302
}

/** Alias histórico. */
export const PAPER_WIDTH_PX = TICKET_WIDTH_PX

/** Ancho útil imprimible (márgenes ~8 px c/u). */
export const TICKET_PRINTABLE_WIDTH_PX: Record<ThermalPaperSize, number> = {
  '58mm': TICKET_WIDTH_PX['58mm'] - 16,
  '80mm': TICKET_WIDTH_PX['80mm'] - 16
}

export const PAPER_PRINTABLE_WIDTH_PX = TICKET_PRINTABLE_WIDTH_PX

export const LABEL_DPI_OPTIONS = [203, 300] as const
export type LabelDpi = (typeof LABEL_DPI_OPTIONS)[number]

export interface LabelPreset {
  id: string
  label: string
  widthMm: number
  heightMm: number
}

/** Tamaños de etiqueta autoadhesiva habituales en impresoras térmicas. */
export const LABEL_PRESETS: LabelPreset[] = [
  { id: '50x25', label: '50 × 25 mm (estándar)', widthMm: 50, heightMm: 25 },
  { id: '40x30', label: '40 × 30 mm', widthMm: 40, heightMm: 30 },
  { id: '60x40', label: '60 × 40 mm', widthMm: 60, heightMm: 40 },
  { id: '30x20', label: '30 × 20 mm', widthMm: 30, heightMm: 20 },
  { id: '30x15', label: '30 × 15 mm (joyería)', widthMm: 30, heightMm: 15 },
  { id: '25x12', label: '25 × 12 mm (joyería chica)', widthMm: 25, heightMm: 12 },
  { id: '20x10', label: '20 × 10 mm (joyería micro)', widthMm: 20, heightMm: 10 },
  { id: '40x15', label: '40 × 15 mm (joyería)', widthMm: 40, heightMm: 15 },
  { id: 'custom', label: 'Personalizado', widthMm: 50, heightMm: 25 }
]

export interface LabelDimensions {
  widthMm: number
  heightMm: number
  dpi: LabelDpi
}

export function parseThermalPaperSize(value: string | undefined): ThermalPaperSize {
  return value === '80mm' ? '80mm' : '58mm'
}

export function parseLabelDpi(value: string | undefined): LabelDpi {
  return value === '300' ? 300 : 203
}

export function mmToMicrons(mm: number): number {
  return Math.round(mm * 1000)
}

export function clampLabelMm(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function resolveLabelDimensions(input: {
  presetId?: string
  widthMm?: number
  heightMm?: number
  dpi?: LabelDpi | number
}): LabelDimensions {
  const preset = LABEL_PRESETS.find((p) => p.id === input.presetId) ?? LABEL_PRESETS[0]
  const widthMm =
    preset.id === 'custom'
      ? clampLabelMm(input.widthMm ?? preset.widthMm, 15, 120)
      : preset.widthMm
  const heightMm =
    preset.id === 'custom'
      ? clampLabelMm(input.heightMm ?? preset.heightMm, 8, 80)
      : preset.heightMm
  const dpi = parseLabelDpi(String(input.dpi ?? 203))
  return { widthMm, heightMm, dpi }
}

/** Etiqueta compacta (joyería / muy pequeña). */
export function isCompactLabel(widthMm: number, heightMm: number): boolean {
  return heightMm <= 16 || widthMm <= 28 || widthMm * heightMm <= 480
}

export function labelBarcodeMaxWidthMm(widthMm: number): number {
  return Math.max(10, Math.round((widthMm - 1.5) * 10) / 10)
}

/** Alto útil de barras según alto de etiqueta y si lleva precio. */
export function labelBarcodeBarsMaxMm(heightMm: number, hasPrice: boolean): number {
  const compact = heightMm <= 16
  const ratio = compact ? (hasPrice ? 0.42 : 0.52) : hasPrice ? 0.58 : 0.68
  const minBars = compact ? Math.max(3.5, heightMm * 0.28) : 8
  return Math.max(minBars, Math.round(heightMm * ratio * 10) / 10)
}

export interface LabelContentLayout {
  padding: string
  nameMaxChars: number
  nameLines: number
  nameFonts: { lg: string; md: string; sm: string }
  priceFont: string
  codeFont: string
  nameClass: 'size-lg' | 'size-md' | 'size-sm'
}

/** Tipografía y límites para que el contenido quepa en el tamaño elegido. */
export function resolveLabelContentLayout(
  dims: Pick<LabelDimensions, 'widthMm' | 'heightMm'>,
  productName: string
): LabelContentLayout {
  const { widthMm, heightMm } = dims
  const compact = isCompactLabel(widthMm, heightMm)
  const jewelry = heightMm <= 16
  const len = productName.trim().length

  let nameFonts: { lg: string; md: string; sm: string }
  let priceFont: string
  let codeFont: string
  let padding: string
  let nameMaxChars: number
  let nameLines: number

  if (jewelry || heightMm <= 14) {
    nameFonts = { lg: '1.55mm', md: '1.35mm', sm: '1.15mm' }
    priceFont = '1.4mm'
    codeFont = widthMm <= 28 ? '1.3mm' : '1.5mm'
    padding = '0.2mm 0.5mm 0.15mm'
    nameMaxChars = widthMm <= 28 ? 28 : 36
    nameLines = 1
  } else if (compact || widthMm <= 35) {
    nameFonts = { lg: '2.0mm', md: '1.75mm', sm: '1.5mm' }
    priceFont = '1.9mm'
    codeFont = '2.0mm'
    padding = '0.35mm 0.8mm 0.2mm'
    nameMaxChars = widthMm <= 32 ? 40 : 52
    nameLines = heightMm >= 18 ? 2 : 1
  } else if (widthMm >= 55) {
    nameFonts = { lg: '2.8mm', md: '2.3mm', sm: '2mm' }
    priceFont = '2.3mm'
    codeFont = '2.8mm'
    padding = '0.5mm 1.2mm 0.25mm'
    nameMaxChars = 80
    nameLines = 2
  } else {
    nameFonts = { lg: '2.5mm', md: '2.1mm', sm: '1.85mm' }
    priceFont = '2.3mm'
    codeFont = '2.6mm'
    padding = '0.5mm 1.2mm 0.25mm'
    nameMaxChars = 70
    nameLines = 2
  }

  const short = widthMm <= 35 || jewelry
  let nameClass: 'size-lg' | 'size-md' | 'size-sm' = 'size-sm'
  if (len <= (short ? 12 : 18)) nameClass = 'size-lg'
  else if (len <= (short ? 22 : 32)) nameClass = 'size-md'

  return {
    padding,
    nameMaxChars,
    nameLines,
    nameFonts,
    priceFont,
    codeFont,
    nameClass
  }
}

/** Presets para hoja A4 (incluye personalizado). */
export const A4_LABEL_PRESETS: LabelPreset[] = LABEL_PRESETS

export const A4_PAGE_WIDTH_MM = 210
export const A4_PAGE_HEIGHT_MM = 297
/** Márgenes de hoja y separación entre etiquetas (mm). */
export const A4_MARGIN_MM = 4
export const A4_GAP_MM = 0.5

export interface A4LabelGrid {
  cols: number
  rows: number
  perSheet: number
  widthMm: number
  heightMm: number
}

/** Cuántas etiquetas caben por hoja A4 con el tamaño dado. */
export function computeA4LabelGrid(widthMm: number, heightMm: number): A4LabelGrid {
  const usableW = A4_PAGE_WIDTH_MM - A4_MARGIN_MM * 2
  const usableH = A4_PAGE_HEIGHT_MM - A4_MARGIN_MM * 2
  const cols = Math.max(1, Math.floor((usableW + A4_GAP_MM) / (widthMm + A4_GAP_MM)))
  const rows = Math.max(1, Math.floor((usableH + A4_GAP_MM) / (heightMm + A4_GAP_MM)))
  return {
    cols,
    rows,
    perSheet: cols * rows,
    widthMm,
    heightMm
  }
}

export function a4SheetsNeeded(labelCount: number, perSheet: number): number {
  if (labelCount <= 0 || perSheet <= 0) return 0
  return Math.ceil(labelCount / perSheet)
}
