import { BrowserWindow } from 'electron'
import { mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { pathToFileURL } from 'url'
import {
  buildPosPrintOptions,
  estimatePrintHeightPx,
  PAPER_WIDTH_PX,
  type PosPrintLine,
  type ThermalPaperSize
} from './pos-print-options'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function lineStyleCss(style: PosPrintLine['style']): string {
  if (!style) return ''
  const parts: string[] = []
  if (style.fontWeight) parts.push(`font-weight:${style.fontWeight}`)
  if (style.textAlign) parts.push(`text-align:${style.textAlign}`)
  if (style.fontSize) parts.push(`font-size:${style.fontSize}`)
  if (style.fontFamily) parts.push(`font-family:${style.fontFamily}`)
  return parts.join(';')
}

function lineToHtml(line: PosPrintLine): string {
  if (line.type === 'image' && line.path) {
    const src = pathToFileURL(line.path).href
    const width = line.width ? `width:${line.width}px;` : 'max-width:100%;'
    const height = line.height ? `height:${line.height}px;` : 'height:auto;'
    const block =
      line.position === 'center' ? 'display:block;margin:2px auto;' : 'display:block;margin:2px 0;'
    return `<div style="text-align:${line.position ?? 'center'}"><img src="${src}" alt="" style="${block}${width}${height}object-fit:contain;" /></div>`
  }

  const css = lineStyleCss(line.style)
  return `<div class="line" style="margin:1px 0;line-height:1.2;word-break:break-word;${css}">${escapeHtml(line.value ?? '')}</div>`
}

function buildReceiptHtml(data: PosPrintLine[], widthPx: number): string {
  const body = data.map(lineToHtml).join('')
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 2px 4px;
      width: ${widthPx}px;
      overflow: hidden;
      background: #fff;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
    }
  </style>
</head>
<body>${body}</body>
</html>`
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
  await new Promise((resolve) => setTimeout(resolve, 150))
}

function writeTempHtml(html: string): string {
  const dir = join(tmpdir(), 'pv-print')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${randomUUID()}.html`)
  writeFileSync(file, html, 'utf8')
  return file
}

function resolvePrinterName(printerName: string): string {
  const name = printerName.trim()
  if (name) return name
  throw new Error('Seleccione la impresora ADV-9013N en Configuración → Impresoras')
}

type PosPrinterModule = {
  PosPrinter: {
    print: (printData: unknown[], options: Record<string, unknown>) => Promise<void>
  }
}

function getPosPrinter(): PosPrinterModule['PosPrinter'] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('electron-pos-printer') as PosPrinterModule).PosPrinter
}

/** Impresión con electron-pos-printer (compatible con impresoras térmicas Windows). */
async function printWithPosPrinter(
  data: PosPrintLine[],
  printerName: string,
  paper: ThermalPaperSize
): Promise<void> {
  const PosPrinter = getPosPrinter()
  await PosPrinter.print(data, buildPosPrintOptions(resolvePrinterName(printerName), data, paper))
}

/** Impresión HTML con ventana ajustada al contenido (menos papel en blanco). */
async function printWithHtmlWindow(
  data: PosPrintLine[],
  printerName: string,
  paper: ThermalPaperSize
): Promise<void> {
  const widthPx = PAPER_WIDTH_PX[paper]
  const htmlFile = writeTempHtml(buildReceiptHtml(data, widthPx))
  const heightPx = estimatePrintHeightPx(data)

  const win = new BrowserWindow({
    width: widthPx,
    height: heightPx,
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

    const contentHeight = await win.webContents.executeJavaScript<number>(
      'Math.ceil(document.documentElement.scrollHeight)'
    )
    const finalHeight = Math.max(64, Math.min(contentHeight + 4, 12000))
    win.setContentSize(widthPx, finalHeight)

    await new Promise<void>((resolve, reject) => {
      win.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: resolvePrinterName(printerName),
          margins: { marginType: 'none' },
          pageSize: { width: widthPx, height: finalHeight },
          copies: 1
        },
        (success, failureReason) => {
          if (!success) {
            reject(new Error(failureReason ?? 'No se pudo imprimir'))
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
  }
}

/**
 * Imprime ticket/etiqueta térmica.
 * Usa electron-pos-printer (más fiable en Windows) y, si falla, HTML ajustado.
 */
export async function printThermalLines(
  data: PosPrintLine[],
  printerName: string,
  paper: ThermalPaperSize
): Promise<void> {
  if (!data.length) return

  try {
    await printWithPosPrinter(data, printerName, paper)
  } catch (posError) {
    try {
      await printWithHtmlWindow(data, printerName, paper)
    } catch (htmlError) {
      const posMsg = posError instanceof Error ? posError.message : String(posError)
      const htmlMsg = htmlError instanceof Error ? htmlError.message : String(htmlError)
      throw new Error(`Impresión fallida: ${posMsg}. Respaldo: ${htmlMsg}`)
    }
  }
}
