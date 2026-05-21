import JsBarcode from 'jsbarcode'

export interface BarcodeOptions {
  width?: number
  height?: number
  fontSize?: number
  displayValue?: boolean
}

/** Genera PNG en base64 (sin prefijo data:) para impresión. */
export async function barcodeToBase64(
  code: string,
  options: BarcodeOptions = {}
): Promise<string> {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

  JsBarcode(svg, code, {
    format: 'CODE128',
    width: options.width ?? 2,
    height: options.height ?? 50,
    fontSize: options.fontSize ?? 14,
    displayValue: options.displayValue ?? true,
    margin: 4,
    textMargin: 2
  })

  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(svg)
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas no disponible')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
    const dataUrl = canvas.toDataURL('image/png')
    return dataUrl.replace(/^data:image\/png;base64,/, '')
  } finally {
    URL.revokeObjectURL(url)
  }
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
    margin: 6
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Error al renderizar código de barras'))
    img.src = src
  })
}
