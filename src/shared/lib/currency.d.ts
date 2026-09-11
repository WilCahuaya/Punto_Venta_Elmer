/** Número de decimales para moneda (siempre 2). */
export declare const CURRENCY_DECIMALS: 2;
/** Formatea un monto con exactamente 2 decimales. */
export declare function formatMoney(amount: number, symbol?: string): string;
/** Redondea a 2 decimales (evita errores de float). */
export declare function roundMoney(amount: number): number;
/** Parsea texto de input a número con 2 decimales. */
export declare function parseMoneyInput(value: string): number | null;
/** Valida que un valor tenga como máximo 2 decimales. */
export declare function isValidMoneyDecimals(value: number): boolean;
