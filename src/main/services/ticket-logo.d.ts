import { type ThermalPaperSize } from './pos-print-options';
export declare function parseTicketLogoWidthPercent(value: string | undefined): number;
/** Ancho del logo en dots ESC/POS según rollo y % elegido. */
export declare function getTicketLogoWidthDots(paper: ThermalPaperSize, widthPercent: number): number;
/** Convierte dots ESC/POS → px CSS para fallback GDI/HTML. */
export declare function escPosDotsToCssPx(dots: number, paper: ThermalPaperSize): number;
export interface PreparedTicketLogo {
    path: string;
    /** Ancho en dots ESC/POS (tamaño real del PNG). */
    width: number;
    /** Alto en dots ESC/POS (proporción 1:1 del original). */
    height: number;
    /** Archivo temporal; eliminar tras imprimir. */
    tempFile: string;
}
/**
 * Escala el logo al % del ancho ESC/POS (203 DPI).
 * El PNG queda en dots reales; ESC/POS lo imprime 1:1.
 */
export declare function prepareTicketLogoForPrint(absoluteLogoPath: string, paper: ThermalPaperSize, widthPercent: number): PreparedTicketLogo | null;
export declare function disposePreparedTicketLogo(prepared: PreparedTicketLogo | null): void;
export declare function getPaperAndLogoPercent(paperSetting: string | undefined, percentSetting: string | undefined): {
    paper: ThermalPaperSize;
    percent: number;
};
