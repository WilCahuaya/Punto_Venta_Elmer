import JsBarcode from 'jsbarcode'
import { errorMessage } from '@shared/lib/error-message'

export { errorMessage }

export interface BarcodeOptions {
  width?: number
  height?: number
  fontSize?: number
  displayValue?: boolean
  margin?: number
}

/** Solo barras (el número se imprime aparte, más grande y legible). */
export const LABEL_BARCODE_OPTIONS: BarcodeOptions = {
  width: 2,
  height: 58,
  fontSize: 6,
  displayValue: false,
  margin: 0
}

/** Opciones compactas para etiquetas pequeñas (p. ej. 25 × 12 mm en A4). */
export function labelBarcodeOptionsForHeight(heightMm: number): BarcodeOptions {
  if (heightMm <= 14) {
    return { width: 1, height: 28, fontSize: 5, displayValue: false, margin: 0 }
  }
  if (heightMm <= 22) {
    return { width: 1, height: 40, fontSize: 6, displayValue: false, margin: 0 }
  }
  return LABEL_BARCODE_OPTIONS
}

/** Genera PNG en base64 (sin prefijo data:) para impresión. */
export async function barcodeToBase64(
  code: string,
  options: BarcodeOptions = {}
): Promise<string> {
  const text = code.trim()
  if (!text) throw new Error('El código de barras está vacío')

  const canvas = document.createElement('canvas')
  try {
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: options.width ?? 2,
      height: options.height ?? 50,
      fontSize: options.fontSize ?? 14,
      displayValue: options.displayValue ?? true,
      margin: options.margin ?? 4,
      textMargin: 0,
      lineColor: '#000000',
      background: '#ffffff'
    })
  } catch (e) {
    throw new Error(`Código no válido para CODE128: ${text}. ${errorMessage(e, '')}`.trim())
  }

  if (canvas.width < 2 || canvas.height < 2) {
    throw new Error(`No se pudo dibujar el código ${text}`)
  }

  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')
}

/** Igual que barcodeToBase64 pero no lanza: un código inválido no tumba el lote. */
export async function barcodeToBase64Safe(
  code: string,
  options: BarcodeOptions = {}
): Promise<string | null> {
  try {
    return await barcodeToBase64(code, options)
  } catch {
    return null
  }
}

export async function barcodesToBase64Map(
  codes: string[],
  options: BarcodeOptions = {}
): Promise<{ images: Record<string, string>; failed: string[] }> {
  const images: Record<string, string> = {}
  const failed: string[] = []
  const unique = [...new Set(codes.map((c) => c.trim()).filter(Boolean))]

  for (const code of unique) {
    const png = await barcodeToBase64Safe(code, options)
    if (png) images[code] = png
    else failed.push(code)
  }

  return { images, failed }
}

/** Renderiza código de barras en un elemento SVG del DOM (vista previa). */
export function renderBarcodeSvg(
  element: SVGSVGElement,
  code: string,
  options?: BarcodeOptions
): void {
  JsBarcode(element, code, {
    format: 'CODE128',
    width: options?.width ?? 2,
    height: options?.height ?? 60,
    fontSize: options?.fontSize ?? 14,
    displayValue: options?.displayValue ?? true,
    margin: options?.margin ?? 6,
    textMargin: 0,
    lineColor: '#000000'
  })
}
