import type { PrinterInfo } from '@shared/types/settings';
/** Impresora Windows predeterminada (caché breve para impresiones consecutivas). */
export declare function getSystemDefaultPrinterName(): Promise<string | null>;
export declare function clearDefaultPrinterCache(): void;
export type PrinterRole = 'tickets' | 'etiquetas';
/**
 * Resuelve nombre de impresora configurada.
 * Orden: valor explícito → alternativa (ej. ticket para etiquetas) → predeterminada Windows.
 */
export declare function resolvePrinterName(configuredName: string, role: PrinterRole, alternateName?: string): Promise<string>;
export declare function mapPrinterList(printers: Electron.PrinterInfo[]): PrinterInfo[];
