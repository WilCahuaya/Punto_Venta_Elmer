import { BrowserWindow, nativeImage } from 'electron'
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { pathToFileURL } from 'url'
import {
  labelBarcodeBarsMaxMm,
  labelBarcodeMaxWidthMm,
  mmToMicrons,
  type LabelDimensions
} from '@shared/lib/thermal-print'
import { resolvePrinterName } from './printer-resolve.service'

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

function getNameSizeClass(name: string, widthMm: number): 'size-lg' | 'size-md' | 'size-sm' {
  const len = name.trim().length
  const short = widthMm <= 35
  if (len <= (short ? 14 : 18)) return 'size-lg'
  if (len <= (short ? 24 : 32)) return 'size-md'
  return 'size-sm'
}

function nameFontSizes(widthMm: number): { lg: string; md: string; sm: string } {
  if (widthMm <= 35) return { lg: '2.1mm', md: '1.85mm', sm: '1.6mm' }
  if (widthMm >= 55) return { lg: '2.8mm', md: '2.3mm', sm: '2mm' }
  return { lg: '2.5mm', md: '2.1mm', sm: '1.85mm' }
}

function prepareBarcodeImage(
  sourcePath: string,
  dims: LabelDimensions,
  hasPrice: boolean
): { path: string; width: number; height: number } {
  const maxWidthPx = Math.round((labelBarcodeMaxWidthMm(dims.widthMm) / 25.4) * dims.dpi)
  const maxHeightPx = Math.round((labelBarcodeBarsMaxMm(dims.heightMm, hasPrice) / 25.4) * dims.dpi)
  const minHeightPx = Math.round((8 / 25.4) * dims.dpi)

  const img = nativeImage.createFromPath(sourcePath)
  if (img.isEmpty()) {
    return { path: sourcePath, width: maxWidthPx, height: minHeightPx }
  }

  const { width: srcW, height: srcH } = img.getSize()
  let targetW = srcW
  let targetH = srcH

  if (targetH < maxHeightPx) {
    targetH = maxHeightPx
    targetW = Math.max(1, Math.round((srcW * targetH) / srcH))
  }

  if (targetW > maxWidthPx) {
    targetW = maxWidthPx
    targetH = Math.max(minHeightPx, Math.round((srcH * targetW) / srcW))
  }

  if (targetH > maxHeightPx) {
    targetH = maxHeightPx
    targetW = Math.max(1, Math.round((srcW * targetH) / srcH))
  }

  targetH = Math.max(minHeightPx, targetH)

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

export function buildLabelHtml(
  content: LabelPrintContent,
  barcode: { path: string; width: number; height: number },
  dims: LabelDimensions
): string {
  const { widthMm, heightMm } = dims
  const imgSrc = pathToFileURL(barcode.path).href
  const rawName = content.productName.trim() || 'Producto'
  const name = escapeHtml(truncate(rawName, 80))
  const nameClass = getNameSizeClass(rawName, widthMm)
  const fonts = nameFontSizes(widthMm)
  const price = content.priceText ? escapeHtml(content.priceText) : ''
  const code = escapeHtml(content.barcodeCode.trim())
  const barsMaxH = `${labelBarcodeBarsMaxMm(heightMm, Boolean(price))}mm`
  const barcodeMaxW = `${labelBarcodeMaxWidthMm(widthMm)}mm`
  const codeFont = widthMm <= 35 ? '2.4mm' : '2.8mm'

  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '  <meta charset="utf-8">',
    '  <style>',
    `    @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`,
    '    * { box-sizing: border-box; margin: 0; padding: 0; }',
    `    html, body { width: ${widthMm}mm; height: ${heightMm}mm; overflow: hidden; background: #fff; }`,
    '    body { font-family: Arial, Helvetica, sans-serif; color: #000;',
    '      -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    `    .label { width: ${widthMm}mm; height: ${heightMm}mm; display: flex; flex-direction: column;`,
    '      align-items: stretch; padding: 0.8mm 1.5mm 0.3mm; }',
    '    .name { text-align: center; font-weight: 700; line-height: 1.05; overflow: hidden;',
    '      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;',
    '      word-break: break-word; hyphens: auto; }',
    `    .name.size-lg { font-size: ${fonts.lg}; }`,
    `    .name.size-md { font-size: ${fonts.md}; }`,
    `    .name.size-sm { font-size: ${fonts.sm}; }`,
    '    .price { text-align: center; font-size: 2.3mm; font-weight: 800; line-height: 1;',
    '      margin: 0.15mm 0; white-space: nowrap; }',
    '    .barcode-wrap { flex: 1; min-height: 0; display: flex; flex-direction: column;',
    '      justify-content: flex-end; gap: 0; overflow: hidden; }',
    '    .barcode-bars { display: flex; align-items: flex-end; justify-content: center; overflow: hidden; }',
    '    .barcode-bars img { display: block; width: 100%; height: auto; object-fit: contain;',
    '      image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;',
    `      max-width: ${barcodeMaxW}; max-height: ${barsMaxH}; }`,
    '    .barcode-code { text-align: center; font-family: "Courier New", Courier, monospace;',
    `      font-size: ${codeFont}; font-weight: 700; letter-spacing: 0.12mm; line-height: 1;`,
    '      margin: 0; padding: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
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

/** Imprime una etiqueta autoadhesiva (tamaño y DPI según configuración). */
export async function printLabel(
  content: LabelPrintContent,
  printerName: string,
  dims: LabelDimensions,
  alternatePrinter = ''
): Promise<void> {
  const hasPrice = Boolean(content.priceText)
  const barcode = prepareBarcodeImage(content.barcodeImagePath, dims, hasPrice)
  const htmlFile = writeTempHtml(buildLabelHtml(content, barcode, dims))
  const winW = mmToScreenPx(dims.widthMm)
  const winH = mmToScreenPx(dims.heightMm)
  const device = await resolvePrinterName(printerName, 'etiquetas', alternatePrinter)

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
          deviceName: device,
          margins: { marginType: 'none' },
          pageSize: {
            width: mmToMicrons(dims.widthMm),
            height: mmToMicrons(dims.heightMm)
          },
          dpi: { horizontal: dims.dpi, vertical: dims.dpi },
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

export async function printLabel50x25(
  content: LabelPrintContent,
  printerName: string
): Promise<void> {
  await printLabel(content, printerName, { widthMm: 50, heightMm: 25, dpi: 203 })
}

/** Etiqueta de prueba (layout y tamaño configurado). */
export async function printTestLabel(
  companyName: string,
  printerName: string,
  dims: LabelDimensions,
  alternatePrinter = ''
): Promise<void> {
  const html = [
    '<!DOCTYPE html><html><head><meta charset="utf-8"><style>',
    `@page { size: ${dims.widthMm}mm ${dims.heightMm}mm; margin: 0; }`,
    `html,body{width:${dims.widthMm}mm;height:${dims.heightMm}mm;margin:0;font-family:Arial,sans-serif;}`,
    '.c{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:2mm;text-align:center;}',
    '.t{font-weight:700;font-size:2.5mm;}.s{font-size:2mm;margin-top:1mm;}.b{font-family:monospace;font-size:2.2mm;margin-top:2mm;}',
    '</style></head><body><div class="c">',
    `<div class="t">${escapeHtml(companyName)}</div>`,
    '<div class="s">ETIQUETA DE PRUEBA</div>',
    `<div class="s">${dims.widthMm} × ${dims.heightMm} mm · ${dims.dpi} DPI</div>`,
    '<div class="b">▮▮▮▮▮▮▮▮▮▮</div>',
    '<div class="b">1234567890123</div>',
    '</div></body></html>'
  ].join('')

  const htmlFile = writeTempHtml(html)
  const device = await resolvePrinterName(printerName, 'etiquetas', alternatePrinter)
  const win = new BrowserWindow({
    width: mmToScreenPx(dims.widthMm),
    height: mmToScreenPx(dims.heightMm),
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: false }
  })

  try {
    await win.loadFile(htmlFile)
    await new Promise<void>((resolve, reject) => {
      win.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: device,
          margins: { marginType: 'none' },
          pageSize: {
            width: mmToMicrons(dims.widthMm),
            height: mmToMicrons(dims.heightMm)
          },
          dpi: { horizontal: dims.dpi, vertical: dims.dpi },
          scaleFactor: 100,
          copies: 1
        },
        (success, failureReason) => {
          if (!success) reject(new Error(failureReason ?? 'No se pudo imprimir'))
          else resolve()
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
  }
}
