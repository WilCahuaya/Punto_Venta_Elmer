import { nativeImage } from 'electron';
import { existsSync } from 'fs';
import { ESC_POS_RASTER_Y_SCALE } from './pos-print-options';
import { sendRawEscPosWindows } from './win-raw-print.service';
/** Píxeles lógicos → micrones (Electron / impresoras térmicas Windows). */
export function pxToMicrons(px) {
    return Math.ceil(264.5833 * px);
}
/**
 * Texto seguro para ESC/POS en POS-80 genéricas (muchas con modo chino).
 * Bytes >= 0xA0 (p. ej. ¡ = 0xA1) se interpretan como inicio de carácter
 * de 2 bytes y se "comen" la letra siguiente → "¡Gracias" sale "racias".
 */
function normalizeText(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/¡/g, '')
        .replace(/¿/g, '?')
        .replace(/[^\x20-\x7E\n\r\t]/g, '?');
}
function escInit() {
    return Buffer.from([0x1b, 0x40]);
}
/** Cancela modo de caracteres chinos (FS .) — evita que 0xA1+letra forme un ideograma. */
function escCancelKanji() {
    return Buffer.from([0x1c, 0x2e]);
}
/** WPC1252 (ESC t 16) — tabla occidental habitual. */
function escSelectWesternCodePage() {
    return Buffer.from([0x1b, 0x74, 16]);
}
function escAlign(align) {
    const mode = align === 'center' ? 1 : align === 'right' ? 2 : 0;
    return Buffer.from([0x1b, 0x61, mode]);
}
function escBold(on) {
    return Buffer.from([0x1b, 0x45, on ? 1 : 0]);
}
function escTextLine(text) {
    return Buffer.from(`${normalizeText(text)}\r\n`, 'latin1');
}
function escFeed(lines = 3) {
    return Buffer.from([0x1b, 0x64, Math.min(255, lines)]);
}
/** Corte parcial (compatible con la mayoría de POS-80 / ESC-POS). */
function escCut() {
    return Buffer.from([0x1d, 0x56, 0x42, 0x00]);
}
function parseAlign(style) {
    const a = style?.textAlign;
    if (a === 'center' || a === 'right')
        return a;
    return 'left';
}
function isBold(style) {
    const w = style?.fontWeight;
    return w === '700' || w === '600' || w === 'bold';
}
/**
 * Convierte PNG/JPG a raster ESC/POS (GS v 0).
 * Bit 1 = punto negro. Ancho en bytes = ceil(width/8).
 * Estira un poco el alto para compensar DPI vertical distinto (círculos redondos).
 */
export function pngPathToEscPosRaster(imagePath) {
    if (!existsSync(imagePath))
        return null;
    const src = nativeImage.createFromPath(imagePath);
    if (src.isEmpty())
        return null;
    const { width: srcW, height: srcH } = src.getSize();
    if (srcW < 1 || srcH < 1)
        return null;
    const width = Math.max(8, Math.ceil(srcW / 8) * 8);
    const height = Math.max(1, Math.round(srcH * ESC_POS_RASTER_Y_SCALE));
    const img = width !== srcW || height !== srcH
        ? src.resize({ width, height, quality: 'better' })
        : src;
    const bitmap = img.toBitmap();
    const bytesPerRow = Math.ceil(width / 8);
    const raster = Buffer.alloc(bytesPerRow * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            // Electron en Windows suele entregar BGRA
            const b = bitmap[i] ?? 0;
            const g = bitmap[i + 1] ?? 0;
            const r = bitmap[i + 2] ?? 0;
            const a = bitmap[i + 3] ?? 255;
            if (a < 40)
                continue;
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (lum < 200) {
                raster[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
            }
        }
    }
    const xL = bytesPerRow & 0xff;
    const xH = (bytesPerRow >> 8) & 0xff;
    const yL = height & 0xff;
    const yH = (height >> 8) & 0xff;
    return Buffer.concat([
        Buffer.from([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]),
        raster
    ]);
}
/** Convierte líneas del ticket a bytes ESC/POS (texto + imágenes raster). */
export function buildEscPosTicketBuffer(data) {
    const chunks = [escInit(), escCancelKanji(), escSelectWesternCodePage()];
    for (const line of data) {
        if (line.type === 'image') {
            if (!line.path)
                continue;
            const raster = pngPathToEscPosRaster(line.path);
            if (!raster)
                continue;
            chunks.push(escAlign('center'));
            chunks.push(raster);
            chunks.push(escTextLine(''));
            chunks.push(escAlign('left'));
            continue;
        }
        const text = (line.value ?? '').trimEnd();
        if (!text) {
            chunks.push(escTextLine(''));
            continue;
        }
        chunks.push(escAlign(parseAlign(line.style)));
        chunks.push(escBold(isBold(line.style)));
        chunks.push(escTextLine(text));
        chunks.push(escBold(false));
        chunks.push(escAlign('left'));
    }
    chunks.push(escFeed(4), escCut());
    return Buffer.concat(chunks);
}
/** Impresión RAW ESC/POS en Windows (puerto USB → WinSpool RAW). */
export async function printEscPosTicket(data, printerName) {
    const buffer = buildEscPosTicketBuffer(data);
    return sendRawEscPosWindows(printerName, buffer);
}
