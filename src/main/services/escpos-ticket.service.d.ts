import { type PosPrintLine } from './pos-print-options';
/** Píxeles lógicos → micrones (Electron / impresoras térmicas Windows). */
export declare function pxToMicrons(px: number): number;
/**
 * Convierte PNG/JPG a raster ESC/POS (GS v 0).
 * Bit 1 = punto negro. Ancho en bytes = ceil(width/8).
 * Estira un poco el alto para compensar DPI vertical distinto (círculos redondos).
 */
export declare function pngPathToEscPosRaster(imagePath: string): Buffer | null;
/** Convierte líneas del ticket a bytes ESC/POS (texto + imágenes raster). */
export declare function buildEscPosTicketBuffer(data: PosPrintLine[]): Buffer;
/** Impresión RAW ESC/POS en Windows (puerto USB → WinSpool RAW). */
export declare function printEscPosTicket(data: PosPrintLine[], printerName: string): Promise<{
    method: string;
}>;
