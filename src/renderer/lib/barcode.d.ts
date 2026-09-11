export interface BarcodeOptions {
    width?: number;
    height?: number;
    fontSize?: number;
    displayValue?: boolean;
    margin?: number;
}
/** Solo barras (el número se imprime aparte, más grande y legible). */
export declare const LABEL_BARCODE_OPTIONS: BarcodeOptions;
/** Opciones compactas para etiquetas pequeñas (p. ej. 25 × 12 mm en A4). */
export declare function labelBarcodeOptionsForHeight(heightMm: number): BarcodeOptions;
/** Genera PNG en base64 (sin prefijo data:) para impresión. */
export declare function barcodeToBase64(code: string, options?: BarcodeOptions): Promise<string>;
/** Igual que barcodeToBase64 pero no lanza: un código inválido no tumba el lote. */
export declare function barcodeToBase64Safe(code: string, options?: BarcodeOptions): Promise<string | null>;
export declare function barcodesToBase64Map(codes: string[], options?: BarcodeOptions): Promise<{
    images: Record<string, string>;
    failed: string[];
}>;
/** Renderiza código de barras en un elemento SVG del DOM (vista previa). */
export declare function renderBarcodeSvg(element: SVGSVGElement, code: string, options?: BarcodeOptions): void;
