/** Ancho de rollo térmico para tickets (POS). */
export type ThermalPaperSize = '58mm' | '80mm';
/**
 * Ancho en píxeles lógicos @ ~96 DPI (CSS) para preview HTML / electron-pos-printer.
 * 80mm ≈ 80/25.4*96 = 302 px — no confundir con dots ESC/POS.
 */
export declare const TICKET_WIDTH_PX: Record<ThermalPaperSize, number>;
/** Alias histórico. */
export declare const PAPER_WIDTH_PX: Record<ThermalPaperSize, number>;
/** Ancho útil imprimible en px CSS (márgenes ~8 px c/u). */
export declare const TICKET_PRINTABLE_WIDTH_PX: Record<ThermalPaperSize, number>;
export declare const PAPER_PRINTABLE_WIDTH_PX: Record<ThermalPaperSize, number>;
/**
 * Ancho imprimible ESC/POS en dots @ 203 DPI (8 dots/mm).
 * Es el tamaño real al enviar raster GS v 0 por USB RAW.
 */
export declare const ESC_POS_PRINTABLE_WIDTH_DOTS: Record<ThermalPaperSize, number>;
/**
 * Compensa DPI vertical distinto en muchas POS-80 (círculos → óvalos anchos).
 * 203/180 ≈ 1.128
 */
export declare const ESC_POS_RASTER_Y_SCALE: number;
export declare const LABEL_DPI_OPTIONS: readonly [203, 300];
export type LabelDpi = (typeof LABEL_DPI_OPTIONS)[number];
export interface LabelPreset {
    id: string;
    label: string;
    widthMm: number;
    heightMm: number;
}
/** Tamaños de etiqueta autoadhesiva habituales en impresoras térmicas. */
export declare const LABEL_PRESETS: LabelPreset[];
export interface LabelDimensions {
    widthMm: number;
    heightMm: number;
    dpi: LabelDpi;
}
export declare function parseThermalPaperSize(value: string | undefined): ThermalPaperSize;
export declare function parseLabelDpi(value: string | undefined): LabelDpi;
export declare function mmToMicrons(mm: number): number;
export declare function clampLabelMm(value: number, min: number, max: number): number;
export declare function resolveLabelDimensions(input: {
    presetId?: string;
    widthMm?: number;
    heightMm?: number;
    dpi?: LabelDpi | number;
}): LabelDimensions;
/** Etiqueta compacta (joyería / muy pequeña). */
export declare function isCompactLabel(widthMm: number, heightMm: number): boolean;
export declare function labelBarcodeMaxWidthMm(widthMm: number): number;
/** Alto útil de barras según alto de etiqueta y si lleva precio. */
export declare function labelBarcodeBarsMaxMm(heightMm: number, hasPrice: boolean): number;
export interface LabelContentLayout {
    padding: string;
    nameMaxChars: number;
    nameLines: number;
    nameFonts: {
        lg: string;
        md: string;
        sm: string;
    };
    priceFont: string;
    codeFont: string;
    nameClass: 'size-lg' | 'size-md' | 'size-sm';
}
/** Tipografía y límites para que el contenido quepa en el tamaño elegido. */
export declare function resolveLabelContentLayout(dims: Pick<LabelDimensions, 'widthMm' | 'heightMm'>, productName: string): LabelContentLayout;
/** Presets para hoja A4 (incluye personalizado). */
export declare const A4_LABEL_PRESETS: LabelPreset[];
export declare const A4_PAGE_WIDTH_MM = 210;
export declare const A4_PAGE_HEIGHT_MM = 297;
/** Márgenes de hoja y separación entre etiquetas (mm). */
export declare const A4_MARGIN_MM = 4;
export declare const A4_GAP_MM = 0.5;
export interface A4LabelGrid {
    cols: number;
    rows: number;
    perSheet: number;
    widthMm: number;
    heightMm: number;
}
/** Cuántas etiquetas caben por hoja A4 con el tamaño dado. */
export declare function computeA4LabelGrid(widthMm: number, heightMm: number): A4LabelGrid;
export declare function a4SheetsNeeded(labelCount: number, perSheet: number): number;
export declare function a4UsableSizeMm(): {
    widthMm: number;
    heightMm: number;
};
export interface A4PackedLabel {
    index: number;
    sheet: number;
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
}
export interface A4PackResult {
    placements: A4PackedLabel[];
    sheets: number;
}
/**
 * Coloca etiquetas de distinto tamaño en hojas A4 (MaxRects / best short side).
 * Las coordenadas son relativas al área útil (después del margen).
 */
export declare function packA4Labels(sizes: Array<{
    widthMm: number;
    heightMm: number;
}>): A4PackResult;
export declare function a4SheetsNeededMixed(sizes: Array<{
    widthMm: number;
    heightMm: number;
}>): number;
