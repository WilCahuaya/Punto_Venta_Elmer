import { ESC_POS_PRINTABLE_WIDTH_DOTS, ESC_POS_RASTER_Y_SCALE, PAPER_WIDTH_PX, PAPER_PRINTABLE_WIDTH_PX, parseThermalPaperSize, type ThermalPaperSize } from '@shared/lib/thermal-print';
export type { ThermalPaperSize };
export { ESC_POS_PRINTABLE_WIDTH_DOTS, ESC_POS_RASTER_Y_SCALE, PAPER_WIDTH_PX, PAPER_PRINTABLE_WIDTH_PX, parseThermalPaperSize };
export interface PosPrintLine {
    type?: string;
    value?: string;
    path?: string;
    position?: string;
    style?: {
        fontSize?: string;
        fontWeight?: string;
        textAlign?: string;
        fontFamily?: string;
    };
    height?: number;
    width?: number;
}
/** Estima alto del contenido en px para preconfigurar la ventana de impresión. */
export declare function estimatePrintHeightPx(data: PosPrintLine[]): number;
/**
 * Opciones para electron-pos-printer.
 * Usar pageSize como string ('80mm') para que la librería calcule el alto real del contenido.
 */
export declare function buildPosPrintOptions(printerName: string, data: PosPrintLine[], paperSize?: ThermalPaperSize): Record<string, unknown>;
