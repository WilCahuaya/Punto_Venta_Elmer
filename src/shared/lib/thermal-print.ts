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
      ? clampLabelMm(input.widthMm ?? preset.widthMm, 20, 120)
      : preset.widthMm
  const heightMm =
    preset.id === 'custom'
      ? clampLabelMm(input.heightMm ?? preset.heightMm, 10, 80)
      : preset.heightMm
  const dpi = parseLabelDpi(String(input.dpi ?? 203))
  return { widthMm, heightMm, dpi }
}

export function labelBarcodeMaxWidthMm(widthMm: number): number {
  return Math.max(20, widthMm - 2)
}

/** Alto útil de barras según alto de etiqueta y si lleva precio. */
export function labelBarcodeBarsMaxMm(heightMm: number, hasPrice: boolean): number {
  const ratio = hasPrice ? 0.58 : 0.68
  return Math.max(8, Math.round(heightMm * ratio * 10) / 10)
}
