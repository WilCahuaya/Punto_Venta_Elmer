/** Número de decimales para moneda (siempre 2). */
export const CURRENCY_DECIMALS = 2;
/** Formatea un monto con exactamente 2 decimales. */
export function formatMoney(amount, symbol = 'S/') {
    const fixed = roundMoney(amount);
    const formatted = fixed.toFixed(CURRENCY_DECIMALS);
    return `${symbol} ${formatted}`;
}
/** Redondea a 2 decimales (evita errores de float). */
export function roundMoney(amount) {
    const factor = 10 ** CURRENCY_DECIMALS;
    return Math.round((amount + Number.EPSILON) * factor) / factor;
}
/** Parsea texto de input a número con 2 decimales. */
export function parseMoneyInput(value) {
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
    if (!cleaned || cleaned === '-' || cleaned === '.')
        return null;
    const num = Number.parseFloat(cleaned);
    if (Number.isNaN(num))
        return null;
    return roundMoney(num);
}
/** Valida que un valor tenga como máximo 2 decimales. */
export function isValidMoneyDecimals(value) {
    const str = value.toString();
    const dot = str.indexOf('.');
    if (dot === -1)
        return true;
    return str.length - dot - 1 <= CURRENCY_DECIMALS;
}
