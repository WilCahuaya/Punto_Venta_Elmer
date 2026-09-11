import { type LabelDimensions } from './thermal-print';
export declare function labelSizeClassName(widthMm: number, heightMm: number): string;
/** CSS de una etiqueta (mismo layout para impresión y vista previa). */
export declare function buildLabelCellCss(dims: LabelDimensions, rootSelector?: string): string;
export interface LabelHtmlContent {
    productName: string;
    priceText: string | null;
    barcodeCode: string;
    /** src de imagen (file:// o data:image/png;base64,...) */
    barcodeSrc: string;
}
/** Celda HTML de una etiqueta (contenido). */
export declare function buildLabelCellHtml(content: LabelHtmlContent, dims: LabelDimensions): string;
/** Documento HTML de una sola etiqueta (rollo / vista previa). */
export declare function buildSingleLabelDocumentHtml(content: LabelHtmlContent, dims: LabelDimensions): string;
