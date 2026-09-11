const SESSION_SELECT = `
  cs.id, cs.opened_at, cs.closed_at, cs.opening_amount, cs.closing_amount,
  cs.expected_amount, cs.difference, cs.status, cs.notes,
  uo.display_name AS opened_by_name, uc.display_name AS closed_by_name
`;
export function getOpenSession(db) {
    return db
        .prepare(`SELECT ${SESSION_SELECT}
       FROM cash_sessions cs
       LEFT JOIN users uo ON uo.id = cs.opened_by
       LEFT JOIN users uc ON uc.id = cs.closed_by
       WHERE cs.status = 'open'
       ORDER BY cs.id DESC LIMIT 1`)
        .get();
}
export function getSessionById(db, id) {
    return db
        .prepare(`SELECT ${SESSION_SELECT}
       FROM cash_sessions cs
       LEFT JOIN users uo ON uo.id = cs.opened_by
       LEFT JOIN users uc ON uc.id = cs.closed_by
       WHERE cs.id = ?`)
        .get(id);
}
export function insertSession(db, data) {
    const result = db
        .prepare(`INSERT INTO cash_sessions (opened_at, opening_amount, status, opened_by)
       VALUES (datetime('now'), ?, 'open', ?)`)
        .run(data.openingAmount, data.openedBy);
    return Number(result.lastInsertRowid);
}
export function closeSession(db, id, data) {
    db.prepare(`UPDATE cash_sessions SET
      closed_at = datetime('now'),
      closing_amount = ?,
      expected_amount = ?,
      difference = ?,
      status = 'closed',
      notes = ?,
      closed_by = ?
     WHERE id = ?`).run(data.closingAmount, data.expectedAmount, data.difference, data.notes, data.closedBy, id);
}
export function sumMovements(db, sessionId, type) {
    const row = db
        .prepare(`SELECT COALESCE(SUM(amount), 0) AS total
       FROM cash_movements WHERE session_id = ? AND type = ?`)
        .get(sessionId, type);
    return Number(row.total);
}
export function sumSalesGross(db, sessionId, paymentMethod) {
    const methodClause = paymentMethod === 'yape'
        ? `AND COALESCE(payment_method, 'cash') = 'yape'`
        : paymentMethod === 'cash'
            ? `AND COALESCE(payment_method, 'cash') = 'cash'`
            : '';
    const row = db
        .prepare(`SELECT COALESCE(SUM(total), 0) AS total FROM sales
       WHERE session_id = ? AND status = 'completed'
         AND COALESCE(is_credit, 0) = 0 ${methodClause}`)
        .get(sessionId);
    return Number(row.total);
}
export function sumReturnsInSession(db, sessionId, paymentMethod) {
    const methodClause = paymentMethod === 'yape'
        ? `AND COALESCE(s.payment_method, 'cash') = 'yape'`
        : paymentMethod === 'cash'
            ? `AND COALESCE(s.payment_method, 'cash') = 'cash'`
            : '';
    const row = db
        .prepare(`SELECT COALESCE(SUM(sri.line_total), 0) AS total
       FROM sale_return_items sri
       INNER JOIN sale_returns sr ON sr.id = sri.return_id
       INNER JOIN sales s ON s.id = sr.sale_id
       WHERE s.session_id = ? AND s.status = 'completed'
         AND COALESCE(s.is_credit, 0) = 0 ${methodClause}`)
        .get(sessionId);
    return Number(row.total);
}
/** Ventas netas del turno (bruto − devoluciones). Filtrar por método para el efectivo esperado. */
export function sumSales(db, sessionId, paymentMethod) {
    const methodClause = paymentMethod === 'yape'
        ? `AND COALESCE(s.payment_method, 'cash') = 'yape'`
        : paymentMethod === 'cash'
            ? `AND COALESCE(s.payment_method, 'cash') = 'cash'`
            : '';
    const row = db
        .prepare(`SELECT COALESCE(SUM(
         s.total - (
           SELECT COALESCE(SUM(sri.line_total), 0)
           FROM sale_return_items sri
           INNER JOIN sale_returns sr ON sr.id = sri.return_id
           WHERE sr.sale_id = s.id
         )
       ), 0) AS total
       FROM sales s
       WHERE s.session_id = ? AND s.status = 'completed'
         AND COALESCE(s.is_credit, 0) = 0 ${methodClause}`)
        .get(sessionId);
    return Number(row.total);
}
export function sumSalesProfit(db, sessionId) {
    const row = db
        .prepare(`SELECT COALESCE(SUM(
         si.line_total
         - si.unit_price * COALESCE(si.returned_quantity, 0)
         - si.cost_price * (
           COALESCE(si.stock_quantity, si.quantity)
           * MAX(0, si.quantity - COALESCE(si.returned_quantity, 0))
           / NULLIF(si.quantity, 0)
         )
       ), 0) AS profit
       FROM sale_items si
       INNER JOIN sales s ON s.id = si.sale_id
       WHERE s.session_id = ? AND s.status = 'completed'`)
        .get(sessionId);
    return Number(row.profit);
}
export function insertMovement(db, data) {
    const result = db
        .prepare(`INSERT INTO cash_movements (session_id, type, amount, concept, reference, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`)
        .run(data.sessionId, data.type, data.amount, data.concept, data.reference, data.createdBy);
    return Number(result.lastInsertRowid);
}
export function listMovements(db, sessionId) {
    return db
        .prepare(`SELECT cm.id, cm.session_id, cm.type, cm.amount, cm.concept, cm.reference, cm.created_at,
              u.display_name AS created_by_name
       FROM cash_movements cm
       LEFT JOIN users u ON u.id = cm.created_by
       WHERE cm.session_id = ?
       ORDER BY cm.created_at DESC`)
        .all(sessionId);
}
export function listSessionHistory(db, filters) {
    const limit = filters.limit ?? 50;
    return db
        .prepare(`SELECT ${SESSION_SELECT}
       FROM cash_sessions cs
       LEFT JOIN users uo ON uo.id = cs.opened_by
       LEFT JOIN users uc ON uc.id = cs.closed_by
       WHERE cs.status = 'closed'
       ORDER BY cs.closed_at DESC
       LIMIT ?`)
        .all(limit);
}
