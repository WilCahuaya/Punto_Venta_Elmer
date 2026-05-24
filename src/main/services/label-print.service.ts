import { BrowserWindow, nativeImage } from 'electron'
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { pathToFileURL } from 'url'

/** Etiqueta autoadhesiva 50 × 25 mm. */
export const LABEL_50X25_MM = { width: 50, height: 25 } as const
export const LABEL_50X25_MICRONS = { width: 50000, height: 25000 } as const
const THERMAL_DPI = 203

/** Ancho útil del código (~46 mm @ 203 DPI). */
const BARCODE_MAX_WIDTH_PX = Math.round((48 / 25.4) * THERMAL_DPI)
/** Con precio: ~14.5 mm solo barras (el número va aparte, pegado abajo). */
const BARCODE_MAX_HEIGHT_WITH_PRICE_PX = Math.round((14.5 / 25.4) * THERMAL_DPI)
/** Sin precio: ~17 mm solo barras. */
const BARCODE_MAX_HEIGHT_NO_PRICE_PX = Math.round((17 / 25.4) * THERMAL_DPI)
const BARCODE_MIN_HEIGHT_PX = Math.round((10 / 25.4) * THERMAL_DPI)

export interface LabelPrintContent {
  companyName: string
  productName: string
  priceText: string | null
  barcodeCode: string
  barcodeImagePath: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** Tamaño de fuente según largo del nombre (máx. 2 líneas en 50 mm). */
function getNameSizeClass(name: string): 'size-lg' | 'size-md' | 'size-sm' {
  const len = name.trim().length
  if (len <= 18) return 'size-lg'
  if (len <= 32) return 'size-md'
  return 'size-sm'
}

function prepareBarcodeImage(
  sourcePath: string,
  hasPrice: boolean
): { path: string; width: number; height: number } {
  const maxHeight = hasPrice ? BARCODE_MAX_HEIGHT_WITH_PRICE_PX : BARCODE_MAX_HEIGHT_NO_PRICE_PX
  const img = nativeImage.createFromPath(sourcePath)
  if (img.isEmpty()) {
    return { path: sourcePath, width: BARCODE_MAX_WIDTH_PX, height: 40 }
  }

  const { width: srcW, height: srcH } = img.getSize()
  let targetW = srcW
  let targetH = srcH

  // Escalar hacia arriba hasta el alto útil (lectores necesitan barras altas).
  if (targetH < maxHeight) {
    targetH = maxHeight
    targetW = Math.max(1, Math.round((srcW * targetH) / srcH))
  }

  if (targetW > BARCODE_MAX_WIDTH_PX) {
    targetW = BARCODE_MAX_WIDTH_PX
    targetH = Math.max(BARCODE_MIN_HEIGHT_PX, Math.round((srcH * targetW) / srcW))
  }

  if (targetH > maxHeight) {
    targetH = maxHeight
    targetW = Math.max(1, Math.round((srcW * targetH) / srcH))
  }

  targetH = Math.max(BARCODE_MIN_HEIGHT_PX, targetH)

  const resized =
    targetW !== srcW || targetH !== srcH
      ? img.resize({ width: targetW, height: targetH, quality: 'better' })
      : img

  if (targetW === srcW && targetH === srcH) {
    return { path: sourcePath, width: targetW, height: targetH }
  }

  const dir = join(tmpdir(), 'pv-labels')
  mkdirSync(dir, { recursive: true })
  const out = join(dir, `${randomUUID()}-barcode.png`)
  writeFileSync(out, resized.toPNG())
  return { path: out, width: targetW, height: targetH }
}

function mmToScreenPx(mm: number): number {
  return Math.max(1, Math.round((mm / 25.4) * 96))
}

export function buildLabel50x25Html(
  content: LabelPrintContent,
  barcode: { path: string; width: number; height: number }
): string {
  const imgSrc = pathToFileURL(barcode.path).href
  const rawName = content.productName.trim() || 'Producto'
  const name = escapeHtml(truncate(rawName, 80))
  const nameClass = getNameSizeClass(rawName)
  const price = content.priceText ? escapeHtml(content.priceText) : ''
  const code = escapeHtml(content.barcodeCode.trim())
  const barsMaxH = price ? '14.5mm' : '17mm'

  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '  <meta charset="utf-8">',
    '  <style>',
    '    @page { size: 50mm 25mm; margin: 0; }',
    '    * { box-sizing: border-box; margin: 0; padding: 0; }',
    '    html, body {',
    '      width: 50mm;',
    '      height: 25mm;',
    '      overflow: hidden;',
    '      background: #fff;',
    '    }',
    '    body {',
    '      font-family: Arial, Helvetica, sans-serif;',
    '      color: #000;',
    '      -webkit-print-color-adjust: exact;',
    '      print-color-adjust: exact;',
    '    }',
    '    .label {',
    '      width: 50mm;',
    '      height: 25mm;',
    '      display: flex;',
    '      flex-direction: column;',
    '      align-items: stretch;',
    '      padding: 0.8mm 1.5mm 0.3mm;',
    '    }',
    '    .name {',
    '      text-align: center;',
    '      font-weight: 700;',
    '      line-height: 1.05;',
    '      max-height: 4.8mm;',
    '      overflow: hidden;',
    '      display: -webkit-box;',
    '      -webkit-line-clamp: 2;',
    '      -webkit-box-orient: vertical;',
    '      word-break: break-word;',
    '      hyphens: auto;',
    '    }',
    '    .name.size-lg { font-size: 2.5mm; }',
    '    .name.size-md { font-size: 2.1mm; }',
    '    .name.size-sm { font-size: 1.85mm; }',
    '    .price {',
    '      text-align: center;',
    '      font-size: 2.3mm;',
    '      font-weight: 800;',
    '      line-height: 1;',
    '      margin: 0.15mm 0;',
    '      white-space: nowrap;',
    '    }',
    '    .barcode-wrap {',
    '      flex: 1;',
    '      min-height: 0;',
    '      display: flex;',
    '      flex-direction: column;',
    '      justify-content: flex-end;',
    '      gap: 0;',
    '      overflow: hidden;',
    '    }',
    '    .barcode-bars {',
    '      display: flex;',
    '      align-items: flex-end;',
    '      justify-content: center;',
    '      overflow: hidden;',
    '    }',
    '    .barcode-bars img {',
    '      display: block;',
    '      width: 100%;',
    '      max-width: 48mm;',
    `      max-height: ${barsMaxH};`,
    '      height: auto;',
    '      object-fit: contain;',
    '      image-rendering: -webkit-optimize-contrast;',
    '      image-rendering: crisp-edges;',
    '    }',
    '    .barcode-code {',
    '      text-align: center;',
    '      font-family: "Courier New", Courier, monospace;',
    '      font-size: 2.8mm;',
    '      font-weight: 700;',
    '      letter-spacing: 0.12mm;',
    '      line-height: 1;',
    '      margin: 0;',
    '      padding: 0;',
    '      white-space: nowrap;',
    '      overflow: hidden;',
    '      text-overflow: ellipsis;',
    '    }',
    '  </style>',
    '</head>',
    '<body>',
    '  <div class="label">',
    `    <div class="name ${nameClass}">${name}</div>`,
    price ? `    <div class="price">${price}</div>` : '',
    '    <div class="barcode-wrap">',
    '      <div class="barcode-bars">',
    `        <img src="${imgSrc}" width="${barcode.width}" height="${barcode.height}" alt="" />`,
    '      </div>',
    code ? `      <p class="barcode-code">${code}</p>` : '',
    '    </div>',
    '  </div>',
    '</body>',
    '</html>'
  ].join('\n')
}

function writeTempHtml(html: string): string {
  const dir = join(tmpdir(), 'pv-labels')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${randomUUID()}.html`)
  writeFileSync(file, html, 'utf8')
  return file
}

function resolvePrinterName(printerName: string): string {
  const name = printerName.trim()
  if (name) return name
  throw new Error('Seleccione la impresora de etiquetas en Configuración')
}

async function waitForImages(win: BrowserWindow): Promise<void> {
  await win.webContents.executeJavaScript(`
    Promise.all(Array.from(document.images).map((img) =>
      img.complete ? Promise.resolve() : new Promise((resolve) => {
        img.onload = resolve
        img.onerror = resolve
      })
    ))
  `)
  await new Promise((resolve) => setTimeout(resolve, 250))
}

/** Imprime una etiqueta autoadhesiva de 50 × 25 mm. */
export async function printLabel50x25(
  content: LabelPrintContent,
  printerName: string
): Promise<void> {
  const hasPrice = Boolean(content.priceText)
  const barcode = prepareBarcodeImage(content.barcodeImagePath, hasPrice)
  const htmlFile = writeTempHtml(buildLabel50x25Html(content, barcode))
  const winW = mmToScreenPx(LABEL_50X25_MM.width)
  const winH = mmToScreenPx(LABEL_50X25_MM.height)

  const win = new BrowserWindow({
    width: winW,
    height: winH,
    useContentSize: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  try {
    await win.loadFile(htmlFile)
    await waitForImages(win)

    await new Promise<void>((resolve, reject) => {
      win.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: resolvePrinterName(printerName),
          margins: { marginType: 'none' },
          pageSize: {
            width: LABEL_50X25_MICRONS.width,
            height: LABEL_50X25_MICRONS.height
          },
          dpi: { horizontal: THERMAL_DPI, vertical: THERMAL_DPI },
          scaleFactor: 100,
          copies: 1
        },
        (success, failureReason) => {
          if (!success) {
            reject(new Error(failureReason ?? 'No se pudo imprimir la etiqueta'))
            return
          }
          resolve()
        }
      )
    })
  } finally {
    win.close()
    try {
      unlinkSync(htmlFile)
    } catch {
      /* ignorar */
    }
    if (barcode.path !== content.barcodeImagePath && existsSync(barcode.path)) {
      try {
        unlinkSync(barcode.path)
      } catch {
        /* ignorar */
      }
    }
  }
}
