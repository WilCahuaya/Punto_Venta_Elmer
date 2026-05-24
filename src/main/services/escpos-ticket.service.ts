import type { PosPrintLine } from './pos-print-options'
import { sendRawEscPosWindows } from './win-raw-print.service'

/** Píxeles lógicos → micrones (Electron / impresoras térmicas Windows). */
export function pxToMicrons(px: number): number {
  return Math.ceil(264.5833 * px)
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, '?')
}

function escInit(): Buffer {
  return Buffer.from([0x1b, 0x40])
}

function escAlign(align: 'left' | 'center' | 'right'): Buffer {
  const mode = align === 'center' ? 1 : align === 'right' ? 2 : 0
  return Buffer.from([0x1b, 0x61, mode])
}

function escBold(on: boolean): Buffer {
  return Buffer.from([0x1b, 0x45, on ? 1 : 0])
}

function escTextLine(text: string): Buffer {
  return Buffer.from(`${normalizeText(text)}\r\n`, 'latin1')
}

function escFeed(lines = 3): Buffer {
  return Buffer.from([0x1b, 0x64, Math.min(255, lines)])
}

/** Corte parcial (compatible con la mayoría de POS-80 / ESC-POS). */
function escCut(): Buffer {
  return Buffer.from([0x1d, 0x56, 0x42, 0x00])
}

function parseAlign(style: PosPrintLine['style']): 'left' | 'center' | 'right' {
  const a = style?.textAlign
  if (a === 'center' || a === 'right') return a
  return 'left'
}

function isBold(style: PosPrintLine['style']): boolean {
  const w = style?.fontWeight
  return w === '700' || w === '600' || w === 'bold'
}

/** Convierte líneas del ticket a bytes ESC/POS (texto; imágenes se omiten). */
export function buildEscPosTicketBuffer(data: PosPrintLine[]): Buffer {
  const chunks: Buffer[] = [escInit()]

  for (const line of data) {
    if (line.type === 'image') continue

    const text = (line.value ?? '').trimEnd()
    if (!text) {
      chunks.push(escTextLine(''))
      continue
    }

    chunks.push(escAlign(parseAlign(line.style)))
    chunks.push(escBold(isBold(line.style)))
    chunks.push(escTextLine(text))
    chunks.push(escBold(false))
    chunks.push(escAlign('left'))
  }

  chunks.push(escFeed(4), escCut())
  return Buffer.concat(chunks)
}

/** Impresión RAW ESC/POS en Windows (puerto USB → WinSpool RAW). */
export async function printEscPosTicket(
  data: PosPrintLine[],
  printerName: string
): Promise<{ method: string }> {
  const buffer = buildEscPosTicketBuffer(data)
  return sendRawEscPosWindows(printerName, buffer)
}
