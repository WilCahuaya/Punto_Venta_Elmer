/** Ancho de rollo térmico soportado por electron-pos-printer. */
export type ThermalPaperSize = '58mm' | '80mm'

export interface PosPrintLine {
  type?: string
  value?: string
  path?: string
  position?: string
  style?: {
    fontSize?: string
    fontWeight?: string
    textAlign?: string
    fontFamily?: string
  }
  height?: number
  width?: number
}

export const PAPER_WIDTH_PX: Record<ThermalPaperSize, number> = {
  '58mm': 219,
  '80mm': 302
}

/** Ancho útil del ticket (márgenes laterales ~8 px c/u). */
export const PAPER_PRINTABLE_WIDTH_PX: Record<ThermalPaperSize, number> = {
  '58mm': PAPER_WIDTH_PX['58mm'] - 16,
  '80mm': PAPER_WIDTH_PX['80mm'] - 16
}

export function parseThermalPaperSize(value: string | undefined): ThermalPaperSize {
  return value === '80mm' ? '80mm' : '58mm'
}

/** Estima alto del contenido en px para preconfigurar la ventana de impresión. */
export function estimatePrintHeightPx(data: PosPrintLine[]): number {
  let height = 8
  for (const row of data) {
    if (row.type === 'image') {
      height += typeof row.height === 'number' ? row.height + 4 : 60
      continue
    }
    const fs = row.style?.fontSize
    let linePx = 14
    if (typeof fs === 'string') {
      const match = fs.match(/(\d+(?:\.\d+)?)/)
      if (match) linePx = Math.ceil(Number.parseFloat(match[1]) * 1.25)
    }
    height += linePx
  }
  return Math.min(12000, Math.max(64, height + 8))
}

/**
 * Opciones para electron-pos-printer.
 * `pageSize` en formato térmico evita que Windows parta cada línea en una hoja A4.
 */
export function buildPosPrintOptions(
  printerName: string,
  data: PosPrintLine[],
  paperSize: ThermalPaperSize = '58mm'
): Record<string, unknown> {
  const heightPx = estimatePrintHeightPx(data)
  const widthPx = PAPER_WIDTH_PX[paperSize]

  return {
    printerName: printerName || undefined,
    preview: false,
    width: paperSize,
    pageSize: {
      width: widthPx,
      height: heightPx
    },
    margin: '0',
    margins: { marginType: 'none' as const },
    copies: 1,
    timeOutPerLine: 400,
    silent: true,
    printBackground: false
  }
}
