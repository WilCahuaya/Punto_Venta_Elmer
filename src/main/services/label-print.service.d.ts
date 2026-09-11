import { type LabelDimensions } from '@shared/lib/thermal-print';
export interface LabelPrintContent {
    companyName: string;
    productName: string;
    priceText: string | null;
    barcodeCode: string;
    barcodeImagePath: string;
    dims?: LabelDimensions;
}
/** Impresoras virtuales que generan PDF/XPS (no respetan pageSize en print silencioso). */
export declare function isPdfVirtualPrinter(name: string): boolean;
export declare function buildLabelHtml(content: LabelPrintContent, barcode: {
    path: string;
    width: number;
    height: number;
}, dims: LabelDimensions): string;
/** Imprime una o varias etiquetas (tamaño real vía PDF). */
export declare function printLabels(contents: LabelPrintContent[], printerName: string, dims: LabelDimensions, alternatePrinter?: string): Promise<void>;
/** Genera el PDF de etiquetas (rollo o A4) sin imprimir. */
export declare function generateLabelsPdf(contents: LabelPrintContent[], dims: LabelDimensions, mode: 'roll' | 'a4'): Promise<{
    pdf: Buffer;
    sheets: number;
}>;
/** Imprime etiquetas en hojas A4 (láser / inyección / PDF). */
export declare function printLabelsOnA4(contents: LabelPrintContent[], printerName: string, dims: LabelDimensions): Promise<{
    printed: number;
    sheets: number;
}>;
/** Imprime una etiqueta autoadhesiva (tamaño y DPI según configuración). */
export declare function printLabel(content: LabelPrintContent, printerName: string, dims: LabelDimensions, alternatePrinter?: string): Promise<void>;
export declare function printLabel50x25(content: LabelPrintContent, printerName: string): Promise<void>;
/** Etiqueta de prueba (layout y tamaño configurado). */
export declare function printTestLabel(companyName: string, printerName: string, dims: LabelDimensions, alternatePrinter?: string): Promise<void>;
