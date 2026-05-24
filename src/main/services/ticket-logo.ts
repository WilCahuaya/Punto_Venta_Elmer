import { nativeImage } from 'electron'
import { existsSync, mkdtempSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  PAPER_PRINTABLE_WIDTH_PX,
  parseThermalPaperSize,
  type ThermalPaperSize
} from './pos-print-options'

export function parseTicketLogoWidthPercent(value: string | undefined): number {
  const n = Number.parseInt(value ?? '65', 10)
  if (!Number.isFinite(n)) return 65
  return Math.min(100, Math.max(40, n))
}

/** Ancho máximo del logo según rollo y porcentaje elegido en configuración. */
export function getTicketLogoMaxWidthPx(
  paper: ThermalPaperSize,
  widthPercent: number
): number {
  const printable = PAPER_PRINTABLE_WIDTH_PX[paper]
  const pct = parseTicketLogoWidthPercent(String(widthPercent))
  return Math.max(48, Math.floor((printable * pct) / 100))
}

const MAX_LOGO_HEIGHT_PX: Record<ThermalPaperSize, number> = {
  '58mm': 56,
  '80mm': 72
}

export interface PreparedTicketLogo {
  path: string
  width: number
  height: number
  /** Archivo temporal; eliminar tras imprimir. */
  tempFile: string
}

/**
 * Escala el logo al ancho del ticket antes de imprimir.
 * electron-pos-printer a veces ignora width/height y usa el tamaño original del archivo.
 */
export function prepareTicketLogoForPrint(
  absoluteLogoPath: string,
  paper: ThermalPaperSize,
  widthPercent: number
): PreparedTicketLogo | null {
  if (!existsSync(absoluteLogoPath)) return null

  const img = nativeImage.createFromPath(absoluteLogoPath)
  if (img.isEmpty()) return null

  const { width: srcW, height: srcH } = img.getSize()
  if (srcW < 1 || srcH < 1) return null

  const maxWidth = getTicketLogoMaxWidthPx(paper, widthPercent)
  const maxHeight = MAX_LOGO_HEIGHT_PX[paper]

  let targetW = srcW
  let targetH = srcH

  if (targetW > maxWidth) {
    targetH = Math.round((targetH * maxWidth) / targetW)
    targetW = maxWidth
  }
  if (targetH > maxHeight) {
    targetW = Math.round((targetW * maxHeight) / targetH)
    targetH = maxHeight
  }

  const resized =
    targetW !== srcW || targetH !== srcH
      ? img.resize({ width: targetW, height: targetH, quality: 'better' })
      : img

  const dir = mkdtempSync(join(tmpdir(), 'pv-ticket-logo-'))
  const tempFile = join(dir, 'logo.png')
  writeFileSync(tempFile, resized.toPNG())

  return {
    path: tempFile,
    width: targetW,
    height: targetH,
    tempFile
  }
}

export function disposePreparedTicketLogo(prepared: PreparedTicketLogo | null): void {
  if (!prepared) return
  try {
    if (existsSync(prepared.tempFile)) unlinkSync(prepared.tempFile)
  } catch {
    /* ignorar */
  }
}

export function getPaperAndLogoPercent(
  paperSetting: string | undefined,
  percentSetting: string | undefined
): { paper: ThermalPaperSize; percent: number } {
  return {
    paper: parseThermalPaperSize(paperSetting),
    percent: parseTicketLogoWidthPercent(percentSetting)
  }
}
