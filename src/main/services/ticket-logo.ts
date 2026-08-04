import { nativeImage } from 'electron'
import { existsSync, mkdtempSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  ESC_POS_PRINTABLE_WIDTH_DOTS,
  PAPER_WIDTH_PX,
  parseThermalPaperSize,
  type ThermalPaperSize
} from './pos-print-options'

export function parseTicketLogoWidthPercent(value: string | undefined): number {
  const n = Number.parseInt(value ?? '65', 10)
  if (!Number.isFinite(n)) return 65
  return Math.min(100, Math.max(40, n))
}

/** Ancho del logo en dots ESC/POS según rollo y % elegido. */
export function getTicketLogoWidthDots(
  paper: ThermalPaperSize,
  widthPercent: number
): number {
  const printable = ESC_POS_PRINTABLE_WIDTH_DOTS[paper]
  const pct = parseTicketLogoWidthPercent(String(widthPercent))
  return Math.max(48, Math.floor((printable * pct) / 100))
}

/** Convierte dots ESC/POS → px CSS para fallback GDI/HTML. */
export function escPosDotsToCssPx(
  dots: number,
  paper: ThermalPaperSize
): number {
  const escW = ESC_POS_PRINTABLE_WIDTH_DOTS[paper]
  const cssW = PAPER_WIDTH_PX[paper]
  return Math.max(1, Math.round((dots * cssW) / escW))
}

export interface PreparedTicketLogo {
  path: string
  /** Ancho en dots ESC/POS (tamaño real del PNG). */
  width: number
  /** Alto en dots ESC/POS (proporción 1:1 del original). */
  height: number
  /** Archivo temporal; eliminar tras imprimir. */
  tempFile: string
}

/**
 * Escala el logo al % del ancho ESC/POS (203 DPI).
 * El PNG queda en dots reales; ESC/POS lo imprime 1:1.
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

  let targetW = getTicketLogoWidthDots(paper, widthPercent)
  // ESC/POS GS v 0 exige ancho múltiplo de 8 dots
  targetW = Math.max(8, Math.ceil(targetW / 8) * 8)

  let targetH = Math.max(1, Math.round((srcH * targetW) / srcW))

  // Tope de alto proporcional (logos muy alargados)
  const maxHeight = Math.round(targetW * 1.25)
  if (targetH > maxHeight) {
    targetH = maxHeight
    targetW = Math.max(8, Math.ceil(((srcW * targetH) / srcH) / 8) * 8)
    targetH = Math.max(1, Math.round((srcH * targetW) / srcW))
    if (targetH > maxHeight) targetH = maxHeight
  }

  const resized = img.resize({ width: targetW, height: targetH, quality: 'better' })

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
