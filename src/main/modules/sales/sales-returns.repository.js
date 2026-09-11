export function getSaleItemsWithReturns(db, saleId) {
    return db
        .prepare(`SELECT id, sale_id, product_id, product_name, barcode, quantity,
              COALESCE(returned_quantity, 0) AS returned_quantity,
              unit_price, line_total, cost_price,
              COALESCE(stock_quantity, quantity) AS stock_quantity
       FROM sale_items WHERE sale_id = ?`)
        .all(saleId);
}
export function getReturnedTotalForSale(db, saleId) {
    const row = db
        .prepare(`SELECT COALESCE(SUM(sri.line_total), 0) AS t
       FROM sale_return_items sri
       INNER JOIN sale_returns sr ON sr.id = sri.return_id
       WHERE sr.sale_id = ?`)
        .get(saleId);
    return row.t;
}
export function insertSaleReturn(db, data) {
    const result = db
        .prepare(`INSERT INTO sale_returns (sale_id, reason, created_by) VALUES (?, ?, ?)`)
        .run(data.saleId, data.reason, data.createdBy);
    return Number(result.lastInsertRowid);
}
export function insertSaleReturnItem(db, data) {
    db.prepare(`INSERT INTO sale_return_items (
      return_id, sale_item_id, product_id, quantity, unit_price, line_total
    ) VALUES (?, ?, ?, ?, ?, ?)`).run(data.returnId, data.saleItemId, data.productId, data.quantity, data.unitPrice, data.lineTotal);
}
export function addReturnedQuantity(db, saleItemId, quantity) {
    db.prepare(`UPDATE sale_items SET returned_quantity = returned_quantity + ? WHERE id = ?`).run(quantity, saleItemId);
}
