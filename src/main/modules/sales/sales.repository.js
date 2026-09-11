export function generateTicketNumber(db) {
    const today = db.prepare(`SELECT date('now') AS d`).get();
    const datePart = today.d.replace(/-/g, '');
    const row = db
        .prepare(`SELECT COUNT(*) AS c FROM sales WHERE date(created_at) = date('now')`)
        .get();
    const seq = String(row.c + 1).padStart(4, '0');
    return `${datePart}-${seq}`;
}
export function insertSale(db, data) {
    const result = db
        .prepare(`INSERT INTO sales (
        ticket_number, session_id, subtotal, discount, total,
        amount_paid, change_amount, payment_method, is_credit, credit_to, price_mode, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(data.ticketNumber, data.sessionId, data.subtotal, data.discount, data.total, data.amountPaid, data.changeAmount, data.paymentMethod, data.isCredit ? 1 : 0, data.creditTo ?? null, data.priceMode, data.createdBy);
    return Number(result.lastInsertRowid);
}
export function insertSaleItem(db, data) {
    db.prepare(`INSERT INTO sale_items (
      sale_id, product_id, product_name, barcode, quantity, unit_price, line_total, cost_price, stock_quantity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(data.saleId, data.productId, data.productName, data.barcode, data.quantity, data.unitPrice, data.lineTotal, data.costPrice, data.stockQuantity);
}
export function decrementStock(db, productId, quantity) {
    const result = db
        .prepare(`UPDATE products SET stock = stock - ?, updated_at = datetime('now')
       WHERE id = ? AND stock >= ?`)
        .run(quantity, productId, quantity);
    return result.changes > 0;
}
export function getSaleById(db, id) {
    return db
        .prepare(`SELECT s.id, s.ticket_number, s.session_id, s.subtotal, s.discount, s.total,
              s.amount_paid, s.change_amount, COALESCE(s.payment_method, 'cash') AS payment_method,
              COALESCE(s.is_credit, 0) AS is_credit, s.credit_to,
              s.price_mode, s.status, s.created_at,
              s.voided_at, s.void_reason, s.voided_by,
              u.display_name AS voided_by_name
       FROM sales s
       LEFT JOIN users u ON u.id = s.voided_by
       WHERE s.id = ?`)
        .get(id);
}
export function voidSaleRecord(db, id, reason, voidedBy) {
    db.prepare(`UPDATE sales SET status = 'voided', voided_at = datetime('now'), void_reason = ?, voided_by = ?
     WHERE id = ? AND status = 'completed'`).run(reason, voidedBy, id);
}
export function restoreStock(db, productId, quantity) {
    db.prepare(`UPDATE products SET stock = stock + ?, updated_at = datetime('now') WHERE id = ?`).run(quantity, productId);
}
export function getSaleItems(db, saleId) {
    return db
        .prepare(`SELECT id, sale_id, product_id, product_name, barcode, quantity, unit_price, line_total, cost_price,
              COALESCE(stock_quantity, quantity) AS stock_quantity
       FROM sale_items WHERE sale_id = ?`)
        .all(saleId);
}
export function listSalesForSession(db, sessionId) {
    return db
        .prepare(`SELECT s.id, s.ticket_number, s.session_id, s.created_at, s.subtotal, s.discount, s.total,
              s.amount_paid, s.change_amount, COALESCE(s.payment_method, 'cash') AS payment_method,
              COALESCE(s.is_credit, 0) AS is_credit, s.credit_to,
              s.status, s.void_reason, s.voided_at,
              u.display_name AS voided_by_name,
              (SELECT COALESCE(SUM(sri.line_total), 0)
               FROM sale_return_items sri
               INNER JOIN sale_returns sr ON sr.id = sri.return_id
               WHERE sr.sale_id = s.id) AS returned_total,
              (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) AS item_count
       FROM sales s
       LEFT JOIN users u ON u.id = s.voided_by
       WHERE s.session_id = ?
       ORDER BY s.created_at DESC`)
        .all(sessionId);
}
