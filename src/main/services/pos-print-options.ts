import {
  PAPER_WIDTH_PX,
  PAPER_PRINTABLE_WIDTH_PX,
  parseThermalPaperSize,
  type ThermalPaperSize
} from '@shared/lib/thermal-print'

export type { ThermalPaperSize }
export { PAPER_WIDTH_PX, PAPER_PRINTABLE_WIDTH_PX, parseThermalPaperSize }

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
 * Usar pageSize como string ('80mm') para que la librería calcule el alto real del contenido.
 */
export function buildPosPrintOptions(
  printerName: string,
  data: PosPrintLine[],
  paperSize: ThermalPaperSize = '58mm'
): Record<string, unknown> {
  return {
    printerName: printerName || undefined,
    preview: false,
    pageSize: paperSize,
    margin: '0 0 0 0',
    margins: { marginType: 'none' as const },
    copies: 1,
    timeOutPerLine: 600,
    silent: true,
    printBackground: true,
    color: false
  }
}
