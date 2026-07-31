import { BrowserWindow, dialog, nativeImage } from 'electron'
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { pathToFileURL } from 'url'
import {
  buildLabelCellCss,
  buildLabelCellHtml,
  buildSingleLabelDocumentHtml
} from '@shared/lib/label-html'
import {
  A4_GAP_MM,
  A4_MARGIN_MM,
  A4_PAGE_HEIGHT_MM,
  A4_PAGE_WIDTH_MM,
  computeA4LabelGrid,
  isCompactLabel,
  labelBarcodeBarsMaxMm,
  labelBarcodeMaxWidthMm,
  mmToMicrons,
  type LabelDimensions
} from '@shared/lib/thermal-print'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
import { resolvePrinterName } from './printer-resolve.service'
import { spawn } from 'child_process'

export interface LabelPrintContent {
  companyName: string
  productName: string
  priceText: string | null
  barcodeCode: string
  barcodeImagePath: string
}

function prepareBarcodeImage(
  sourcePath: string,
  dims: LabelDimensions,
  hasPrice: boolean
): { path: string; width: number; height: number } {
  const maxWidthPx = Math.round((labelBarcodeMaxWidthMm(dims.widthMm) / 25.4) * dims.dpi)
  const maxHeightPx = Math.round((labelBarcodeBarsMaxMm(dims.heightMm, hasPrice) / 25.4) * dims.dpi)
  const minBarsMm = isCompactLabel(dims.widthMm, dims.heightMm) ? 3.5 : 8
  const minHeightPx = Math.round((minBarsMm / 25.4) * dims.dpi)

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

/** Impresoras virtuales que generan PDF/XPS (no respetan pageSize en print silencioso). */
export function isPdfVirtualPrinter(name: string): boolean {
  const n = name.toLowerCase()
  return (
    n.includes('pdf') ||
    n.includes('xps') ||
    n.includes('onenote') ||
    n.includes('fax') ||
    n.includes('document writer')
  )
}

function buildLabelBodyHtml(
  content: LabelPrintContent,
  barcode: { path: string; width: number; height: number },
  dims: LabelDimensions
): string {
  return buildLabelCellHtml(
    {
      productName: content.productName,
      priceText: content.priceText,
      barcodeCode: content.barcodeCode,
      barcodeSrc: pathToFileURL(barcode.path).href
    },
    dims
  )
}

function buildLabelsDocumentHtml(bodies: string[], dims: LabelDimensions): string {
  const { widthMm, heightMm } = dims
  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '  <meta charset="utf-8">',
    '  <style>',
    `    @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`,
    '    * { box-sizing: border-box; margin: 0; padding: 0; }',
    '    html, body { margin: 0; padding: 0; background: #fff;',
    '      font-family: Arial, Helvetica, sans-serif; color: #000;',
    '      -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    buildLabelCellCss(dims),
    '    .label { page-break-after: always; break-after: page; }',
    '    .label:last-child { page-break-after: auto; break-after: auto; }',
    '  </style>',
    '</head>',
    '<body>',
    ...bodies,
    '</body>',
    '</html>'
  ].join('\n')
}

export function buildLabelHtml(
  content: LabelPrintContent,
  barcode: { path: string; width: number; height: number },
  dims: LabelDimensions
): string {
  return buildSingleLabelDocumentHtml(
    {
      productName: content.productName,
      priceText: content.priceText,
      barcodeCode: content.barcodeCode,
      barcodeSrc: pathToFileURL(barcode.path).href
    },
    dims
  )
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

async function savePdfWithDialog(pdf: Buffer, defaultName: string): Promise<string> {
  const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const result = await dialog.showSaveDialog(parent ?? undefined, {
    title: 'Guardar etiquetas PDF',
    defaultPath: defaultName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (result.canceled || !result.filePath) {
    throw new Error('Guardado de PDF cancelado')
  }
  const filePath = result.filePath.endsWith('.pdf') ? result.filePath : `${result.filePath}.pdf`
  writeFileSync(filePath, pdf)
  return filePath
}

function escapePsSingleQuoted(value: string): string {
  return value.replace(/'/g, "''")
}

/** Envía un PDF a una impresora física (Windows PrintTo). */
async function printPdfFileToPrinter(pdfPath: string, printerName: string): Promise<void> {
  const script = `
$pdf = '${escapePsSingleQuoted(pdfPath)}'
$printer = '${escapePsSingleQuoted(printerName)}'
$p = Start-Process -FilePath $pdf -Verb PrintTo -ArgumentList $printer -PassThru -WindowStyle Hidden -ErrorAction Stop
if ($p) { Wait-Process -Id $p.Id -Timeout 60 -ErrorAction SilentlyContinue }
Start-Sleep -Milliseconds 800
`
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true }
    )
    let stderr = ''
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `No se pudo imprimir el PDF (código ${code})`))
    })
  })
}

async function renderHtmlToPdf(
  htmlFile: string,
  page: { widthMm: number; heightMm: number },
  windowSize?: { width: number; height: number }
): Promise<Buffer> {
  const winW = windowSize?.width ?? Math.max(mmToScreenPx(page.widthMm), 120)
  const winH = windowSize?.height ?? Math.max(mmToScreenPx(page.heightMm), 80)
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
    return await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: {
        width: mmToMicrons(page.widthMm),
        height: mmToMicrons(page.heightMm)
      },
      margins: { marginType: 'none' },
      scale: 1
    })
  } finally {
    win.close()
  }
}

async function printHtmlSilent(
  htmlFile: string,
  page: { widthMm: number; heightMm: number },
  device: string,
  dpi = 203
): Promise<void> {
  const winW = Math.min(900, Math.max(mmToScreenPx(page.widthMm), 120))
  const winH = Math.min(1200, Math.max(mmToScreenPx(page.heightMm), 80))
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
            width: mmToMicrons(page.widthMm),
            height: mmToMicrons(page.heightMm)
          },
          dpi: { horizontal: dpi, vertical: dpi },
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
  }
}

async function deliverLabelDocument(
  htmlFile: string,
  page: { widthMm: number; heightMm: number },
  device: string,
  pdfDefaultName: string,
  dpi = 203
): Promise<'pdf' | 'print'> {
  const pdf = await renderHtmlToPdf(htmlFile, page, {
    width: Math.min(900, Math.max(mmToScreenPx(page.widthMm), 400)),
    height: Math.min(1200, Math.max(mmToScreenPx(page.heightMm), 500))
  })

  if (isPdfVirtualPrinter(device)) {
    await savePdfWithDialog(pdf, pdfDefaultName)
    return 'pdf'
  }

  const dir = join(tmpdir(), 'pv-labels')
  mkdirSync(dir, { recursive: true })
  const pdfPath = join(dir, `${randomUUID()}.pdf`)
  writeFileSync(pdfPath, pdf)

  try {
    await printPdfFileToPrinter(pdfPath, device)
    return 'print'
  } catch {
    await printHtmlSilent(htmlFile, page, device, dpi)
    return 'print'
  } finally {
    setTimeout(() => {
      try {
        unlinkSync(pdfPath)
      } catch {
        /* ignorar */
      }
    }, 20000)
  }
}

function cleanupBarcodeTemps(
  barcodes: Array<{ path: string }>,
  originals: string[]
): void {
  for (const b of barcodes) {
    if (!originals.includes(b.path) && existsSync(b.path)) {
      try {
        unlinkSync(b.path)
      } catch {
        /* ignorar */
      }
    }
  }
}

/** Imprime una o varias etiquetas (tamaño real vía PDF). */
export async function printLabels(
  contents: LabelPrintContent[],
  printerName: string,
  dims: LabelDimensions,
  alternatePrinter = ''
): Promise<void> {
  if (!contents.length) throw new Error('No hay etiquetas para imprimir')

  const prepared = contents.map((content) => {
    const barcode = prepareBarcodeImage(content.barcodeImagePath, dims, Boolean(content.priceText))
    return { content, barcode }
  })
  const bodies = prepared.map(({ content, barcode }) =>
    buildLabelBodyHtml(content, barcode, dims)
  )
  const htmlFile = writeTempHtml(buildLabelsDocumentHtml(bodies, dims))
  const device = await resolvePrinterName(printerName, 'etiquetas', alternatePrinter)
  const pdfName = `etiquetas-${dims.widthMm}x${dims.heightMm}mm.pdf`

  try {
    await deliverLabelDocument(
      htmlFile,
      { widthMm: dims.widthMm, heightMm: dims.heightMm },
      device,
      pdfName,
      dims.dpi
    )
  } finally {
    try {
      unlinkSync(htmlFile)
    } catch {
      /* ignorar */
    }
    cleanupBarcodeTemps(
      prepared.map((p) => p.barcode),
      contents.map((c) => c.barcodeImagePath)
    )
  }
}

function buildA4SheetDocumentHtml(
  cells: string[],
  dims: LabelDimensions,
  grid: ReturnType<typeof computeA4LabelGrid>
): string {
  const pages: string[] = []
  const { perSheet, cols } = grid

  for (let i = 0; i < cells.length; i += perSheet) {
    const chunk = cells.slice(i, i + perSheet)
    while (chunk.length < perSheet) {
      chunk.push('<div class="label empty"></div>')
    }
    pages.push(
      [
        '<div class="sheet">',
        `  <div class="grid" style="grid-template-columns:repeat(${cols}, ${dims.widthMm}mm);">`,
        ...chunk.map((c) => `    ${c}`),
        '  </div>',
        '</div>'
      ].join('\n')
    )
  }

  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '  <meta charset="utf-8">',
    '  <style>',
    `    @page { size: ${A4_PAGE_WIDTH_MM}mm ${A4_PAGE_HEIGHT_MM}mm; margin: 0; }`,
    '    * { box-sizing: border-box; margin: 0; padding: 0; }',
    '    html, body { margin: 0; padding: 0; background: #fff;',
    '      font-family: Arial, Helvetica, sans-serif; color: #000;',
    '      -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    `    .sheet { width: ${A4_PAGE_WIDTH_MM}mm; height: ${A4_PAGE_HEIGHT_MM}mm;`,
    `      padding: ${A4_MARGIN_MM}mm; page-break-after: always; break-after: page; overflow: hidden; }`,
    '    .sheet:last-child { page-break-after: auto; break-after: auto; }',
    `    .grid { display: grid; gap: ${A4_GAP_MM}mm; justify-content: start; align-content: start; }`,
    buildLabelCellCss(dims),
    '    .label { border: 0.12mm dashed #bbb; }',
    '    .label.empty { border-color: transparent; }',
    '  </style>',
    '</head>',
    '<body>',
    ...pages,
    '</body>',
    '</html>'
  ].join('\n')
}

/** Genera el PDF de etiquetas (rollo o A4) sin imprimir. */
export async function generateLabelsPdf(
  contents: LabelPrintContent[],
  dims: LabelDimensions,
  mode: 'roll' | 'a4'
): Promise<{ pdf: Buffer; sheets: number }> {
  if (!contents.length) throw new Error('No hay etiquetas para previsualizar')

  const prepared = contents.map((content) => {
    const barcode = prepareBarcodeImage(content.barcodeImagePath, dims, Boolean(content.priceText))
    return { content, barcode }
  })

  let htmlFile: string
  let page: { widthMm: number; heightMm: number }
  let sheets = 1

  if (mode === 'a4') {
    const grid = computeA4LabelGrid(dims.widthMm, dims.heightMm)
    sheets = Math.ceil(contents.length / grid.perSheet)
    const cells = prepared.map(({ content, barcode }) =>
      buildLabelBodyHtml(content, barcode, dims)
    )
    htmlFile = writeTempHtml(buildA4SheetDocumentHtml(cells, dims, grid))
    page = { widthMm: A4_PAGE_WIDTH_MM, heightMm: A4_PAGE_HEIGHT_MM }
  } else {
    const bodies = prepared.map(({ content, barcode }) =>
      buildLabelBodyHtml(content, barcode, dims)
    )
    htmlFile = writeTempHtml(buildLabelsDocumentHtml(bodies, dims))
    page = { widthMm: dims.widthMm, heightMm: dims.heightMm }
    sheets = contents.length
  }

  try {
    const pdf = await renderHtmlToPdf(htmlFile, page, {
      width: Math.min(900, Math.max(mmToScreenPx(page.widthMm), 400)),
      height: Math.min(1200, Math.max(mmToScreenPx(page.heightMm), 500))
    })
    return { pdf, sheets }
  } finally {
    try {
      unlinkSync(htmlFile)
    } catch {
      /* ignorar */
    }
    cleanupBarcodeTemps(
      prepared.map((p) => p.barcode),
      contents.map((c) => c.barcodeImagePath)
    )
  }
}

/** Imprime etiquetas en hojas A4 (láser / inyección / PDF). */
export async function printLabelsOnA4(
  contents: LabelPrintContent[],
  printerName: string,
  dims: LabelDimensions
): Promise<{ printed: number; sheets: number }> {
  if (!contents.length) throw new Error('No hay etiquetas para imprimir')
  if (!printerName.trim()) throw new Error('Seleccione una impresora para A4')

  const { pdf, sheets } = await generateLabelsPdf(contents, dims, 'a4')
  const device = printerName.trim()
  const pdfName = `etiquetas-A4-${dims.widthMm}x${dims.heightMm}mm.pdf`

  if (isPdfVirtualPrinter(device)) {
    await savePdfWithDialog(pdf, pdfName)
    return { printed: contents.length, sheets }
  }

  const dir = join(tmpdir(), 'pv-labels')
  mkdirSync(dir, { recursive: true })
  const pdfPath = join(dir, `${randomUUID()}.pdf`)
  writeFileSync(pdfPath, pdf)

  try {
    try {
      await printPdfFileToPrinter(pdfPath, device)
    } catch {
      const grid = computeA4LabelGrid(dims.widthMm, dims.heightMm)
      const prepared = contents.map((content) => {
        const barcode = prepareBarcodeImage(
          content.barcodeImagePath,
          dims,
          Boolean(content.priceText)
        )
        return { content, barcode }
      })
      const cells = prepared.map(({ content, barcode }) =>
        buildLabelBodyHtml(content, barcode, dims)
      )
      const htmlFile = writeTempHtml(buildA4SheetDocumentHtml(cells, dims, grid))
      try {
        await printHtmlSilent(
          htmlFile,
          { widthMm: A4_PAGE_WIDTH_MM, heightMm: A4_PAGE_HEIGHT_MM },
          device,
          300
        )
      } finally {
        try {
          unlinkSync(htmlFile)
        } catch {
          /* ignorar */
        }
        cleanupBarcodeTemps(
          prepared.map((p) => p.barcode),
          contents.map((c) => c.barcodeImagePath)
        )
      }
    }
  } finally {
    setTimeout(() => {
      try {
        unlinkSync(pdfPath)
      } catch {
        /* ignorar */
      }
    }, 20000)
  }

  return { printed: contents.length, sheets }
}

/** Imprime una etiqueta autoadhesiva (tamaño y DPI según configuración). */
export async function printLabel(
  content: LabelPrintContent,
  printerName: string,
  dims: LabelDimensions,
  alternatePrinter = ''
): Promise<void> {
  await printLabels([content], printerName, dims, alternatePrinter)
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

  try {
    await deliverLabelDocument(
      htmlFile,
      { widthMm: dims.widthMm, heightMm: dims.heightMm },
      device,
      `etiqueta-prueba-${dims.widthMm}x${dims.heightMm}mm.pdf`,
      dims.dpi
    )
  } finally {
    try {
      unlinkSync(htmlFile)
    } catch {
      /* ignorar */
    }
  }
}
