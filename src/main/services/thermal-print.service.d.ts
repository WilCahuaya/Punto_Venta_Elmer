import { type PosPrintLine, type ThermalPaperSize } from './pos-print-options';
/**
 * Imprime ticket térmico.
 * 1) ESC/POS RAW (POS-80 y similares en Windows)
 * 2) electron-pos-printer (GDI)
 * 3) HTML con ventana ajustada
 */
export declare function printThermalLines(data: PosPrintLine[], printerName: string, paper: ThermalPaperSize): Promise<{
    method: string;
}>;
