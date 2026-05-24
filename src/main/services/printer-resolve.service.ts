import { BrowserWindow } from 'electron'
import type { PrinterInfo } from '@shared/types/settings'

let cachedDefaultPrinter: string | null = null

async function fetchDefaultPrinterName(): Promise<string | null> {
  try {
    let win = BrowserWindow.getAllWindows()[0]
    let temp: BrowserWindow | null = null
    if (!win) {
      temp = new BrowserWindow({ show: false, width: 400, height: 300 })
      win = temp
    }
    const printers = await win.webContents.getPrintersAsync()
    temp?.destroy()
    const def = printers.find((p) => p.isDefault)
    return def?.name ?? printers[0]?.name ?? null
  } catch {
    return null
  }
}

/** Impresora Windows predeterminada (caché breve para impresiones consecutivas). */
export async function getSystemDefaultPrinterName(): Promise<string | null> {
  if (cachedDefaultPrinter) return cachedDefaultPrinter
  cachedDefaultPrinter = await fetchDefaultPrinterName()
  return cachedDefaultPrinter
}

export function clearDefaultPrinterCache(): void {
  cachedDefaultPrinter = null
}

export type PrinterRole = 'tickets' | 'etiquetas'

const ROLE_LABEL: Record<PrinterRole, string> = {
  tickets: 'tickets (POS)',
  etiquetas: 'etiquetas'
}

/**
 * Resuelve nombre de impresora configurada.
 * Orden: valor explícito → alternativa (ej. ticket para etiquetas) → predeterminada Windows.
 */
export async function resolvePrinterName(
  configuredName: string,
  role: PrinterRole,
  alternateName = ''
): Promise<string> {
  const primary = configuredName.trim()
  if (primary) return primary

  const alternate = alternateName.trim()
  if (alternate) return alternate

  const systemDefault = await getSystemDefaultPrinterName()
  if (systemDefault) return systemDefault

  throw new Error(
    `No hay impresora de ${ROLE_LABEL[role]}. Conecte la impresora en Windows, pulse «Detectar impresoras» en Configuración y selecciónela.`
  )
}

export function mapPrinterList(printers: Electron.PrinterInfo[]): PrinterInfo[] {
  clearDefaultPrinterCache()
  return printers.map((p) => ({
    name: p.name,
    displayName: p.displayName || p.name,
    isDefault: p.isDefault,
    status: p.status
  }))
}
