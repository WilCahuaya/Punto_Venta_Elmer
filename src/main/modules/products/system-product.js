import { SYSTEM_SERVICE_PRODUCT_CODE } from '@shared/constants/system';
const SYSTEM_SERVICE_NAME = 'Servicio (sistema)';
export function isSystemServiceProductCode(code) {
    return code === SYSTEM_SERVICE_PRODUCT_CODE;
}
export function isSystemServiceProductId(db, productId) {
    const row = db
        .prepare('SELECT product_code FROM products WHERE id = ?')
        .get(productId);
    return row != null && isSystemServiceProductCode(row.product_code);
}
/** Crea el producto interno si no existe; no aparece en catálogo ni POS. */
export function ensureSystemServiceProduct(db) {
    const existing = db
        .prepare('SELECT id FROM products WHERE product_code = ?')
        .get(SYSTEM_SERVICE_PRODUCT_CODE);
    if (existing)
        return existing.id;
    const result = db
        .prepare(`INSERT INTO products (
        name, product_code, barcode, category_id, stock, stock_min,
        cost_price, price_retail, price_wholesale, is_active
      ) VALUES (?, ?, NULL, NULL, 0, 0, 0, 0, 0, 0)`)
        .run(SYSTEM_SERVICE_NAME, SYSTEM_SERVICE_PRODUCT_CODE);
    return Number(result.lastInsertRowid);
}
export function systemServiceExcludeSql(alias = 'p') {
    return `(${alias}.product_code IS NULL OR ${alias}.product_code != '${SYSTEM_SERVICE_PRODUCT_CODE}')`;
}
