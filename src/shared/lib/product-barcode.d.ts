/** Extrae iniciales de cada palabra (ej. "Ropa Hombre" → "RH", "Camisa Polo" → "CP"). */
export declare function extractInitials(text: string, maxWords?: number, charsPerWord?: number): string;
/**
 * Código legible con iniciales de categoría y producto (ej. RH-CP-3847).
 */
export declare function deriveBarcodeFromCatalog(categoryName: string, productName: string): string;
/**
 * Corrige lecturas de escáner en modo teclado cuando el layout del PC
 * no coincide con el del lector (ej. guiones impresos como LA-LA-6551
 * llegan como LA'LA'6551 en Windows en español).
 */
export declare function normalizeScannedBarcode(scanned: string): string;
export declare function resolveUniqueBarcode(base: string, isTaken: (code: string) => boolean): string;
