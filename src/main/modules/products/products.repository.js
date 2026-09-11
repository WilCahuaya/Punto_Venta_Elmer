import { systemServiceExcludeSql } from './system-product';
const SELECT_FIELDS = `
  p.id, p.product_code, p.name, p.barcode, p.category_id, c.name AS category_name,
  p.stock, p.stock_min, p.brand, p.size, p.color, p.description,
  p.cost_price, p.price_retail, p.price_wholesale,
  p.price_dozen, p.plancha_qty, p.price_plancha, p.cajon_qty, p.price_cajon,
  p.image_path, p.is_active, p.created_at, p.updated_at
`;
export function listProducts(db, filters) {
    const conditions = [systemServiceExcludeSql('p')];
    const params = [];
    if (!filters.includeInactive) {
        conditions.push('p.is_active = 1');
    }
    if (filters.search?.trim()) {
        conditions.push('(p.name LIKE ? OR p.barcode LIKE ? OR p.product_code LIKE ?)');
        const q = `%${filters.search.trim()}%`;
        params.push(q, q, q);
    }
    if (filters.categoryId) {
        conditions.push('p.category_id = ?');
        params.push(filters.categoryId);
    }
    if (filters.lowStockOnly) {
        conditions.push('p.stock <= p.stock_min');
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return db
        .prepare(`SELECT ${SELECT_FIELDS}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.name ASC`)
        .all(...params);
}
export function getProductById(db, id) {
    return db
        .prepare(`SELECT ${SELECT_FIELDS}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`)
        .get(id);
}
export function getProductByBarcodeRow(db, barcode) {
    return db
        .prepare(`SELECT ${SELECT_FIELDS}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.barcode = ? AND p.is_active = 1`)
        .get(barcode);
}
export function searchProductsPos(db, query, limit = 15) {
    const q = `%${query.trim()}%`;
    return db
        .prepare(`SELECT ${SELECT_FIELDS}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = 1 AND ${systemServiceExcludeSql('p')}
         AND (p.name LIKE ? OR p.barcode LIKE ? OR p.product_code LIKE ?)
       ORDER BY p.name ASC
       LIMIT ?`)
        .all(q, q, q, limit);
}
export function getProductByBarcode(db, barcode, excludeId) {
    if (excludeId) {
        return db
            .prepare('SELECT id FROM products WHERE barcode = ? AND id != ?')
            .get(barcode, excludeId);
    }
    return db.prepare('SELECT id FROM products WHERE barcode = ?').get(barcode);
}
export function getProductByCode(db, productCode, excludeId) {
    if (excludeId) {
        return db
            .prepare('SELECT id FROM products WHERE product_code = ? AND id != ?')
            .get(productCode, excludeId);
    }
    return db.prepare('SELECT id FROM products WHERE product_code = ?').get(productCode);
}
export function insertProduct(db, data) {
    const result = db
        .prepare(`INSERT INTO products (
        product_code, name, barcode, category_id, stock, stock_min, brand, size, color, description,
        cost_price, price_retail, price_wholesale,
        price_dozen, plancha_qty, price_plancha, cajon_qty, price_cajon,
        image_path, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(data.productCode, data.name, data.barcode, data.categoryId, data.stock, data.stockMin, data.brand, data.size, data.color, data.description, data.costPrice, data.priceRetail, data.priceWholesale, data.priceDozen, data.planchaQty, data.pricePlancha, data.cajonQty, data.priceCajon, data.imagePath, data.isActive);
    return Number(result.lastInsertRowid);
}
export function updateProduct(db, id, data) {
    db.prepare(`UPDATE products SET
      product_code = ?, name = ?, barcode = ?, category_id = ?, stock_min = ?,
      brand = ?, size = ?, color = ?, description = ?,
      cost_price = ?, price_retail = ?, price_wholesale = ?,
      price_dozen = ?, plancha_qty = ?, price_plancha = ?, cajon_qty = ?, price_cajon = ?,
      image_path = ?, is_active = ?, updated_at = datetime('now')
     WHERE id = ?`).run(data.productCode, data.name, data.barcode, data.categoryId, data.stockMin, data.brand, data.size, data.color, data.description, data.costPrice, data.priceRetail, data.priceWholesale, data.priceDozen, data.planchaQty, data.pricePlancha, data.cajonQty, data.priceCajon, data.imagePath, data.isActive, id);
}
export function updateProductStock(db, id, stock) {
    db.prepare(`UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?`).run(stock, id);
}
export function updateProductImagePath(db, id, imagePath) {
    db.prepare(`UPDATE products SET image_path = ?, updated_at = datetime('now') WHERE id = ?`).run(imagePath, id);
}
export function softDeleteProduct(db, id) {
    db.prepare(`UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(id);
}
export function countSaleItemsForProduct(db, productId) {
    const row = db
        .prepare('SELECT COUNT(*) AS c FROM sale_items WHERE product_id = ?')
        .get(productId);
    return row.c;
}
export function hardDeleteProduct(db, id) {
    const result = db
        .prepare('DELETE FROM products WHERE id = ? AND is_active = 0')
        .run(id);
    return result.changes > 0;
}
export function countLowStockProducts(db) {
    const row = db
        .prepare(`SELECT COUNT(*) AS c FROM products WHERE is_active = 1 AND stock <= stock_min`)
        .get();
    return row.c;
}
