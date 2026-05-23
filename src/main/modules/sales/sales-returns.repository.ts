import type Database from 'better-sqlite3'

export interface SaleItemWithReturnsRow {
  id: number
  sale_id: number
  product_id: number
  product_name: string
  barcode: string | null
  quantity: number
  returned_quantity: number
  unit_price: string
  line_total: string
  cost_price: string
}

export function getSaleItemsWithReturns(
  db: Database.Database,
  saleId: number
): SaleItemWithReturnsRow[] {
  return db
    .prepare(
      `SELECT id, sale_id, product_id, product_name, barcode, quantity,
              COALESCE(returned_quantity, 0) AS returned_quantity,
              unit_price, line_total, cost_price
       FROM sale_items WHERE sale_id = ?`
    )
    .all(saleId) as SaleItemWithReturnsRow[]
}

export function getReturnedTotalForSale(db: Database.Database, saleId: number): string {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(sri.line_total), 0) AS t
       FROM sale_return_items sri
       INNER JOIN sale_returns sr ON sr.id = sri.return_id
       WHERE sr.sale_id = ?`
    )
    .get(saleId) as { t: string }
  return row.t
}

export function insertSaleReturn(
  db: Database.Database,
  data: { saleId: number; reason: string; createdBy: number | null }
): number {
  const result = db
    .prepare(
      `INSERT INTO sale_returns (sale_id, reason, created_by) VALUES (?, ?, ?)`
    )
    .run(data.saleId, data.reason, data.createdBy)
  return Number(result.lastInsertRowid)
}

export function insertSaleReturnItem(
  db: Database.Database,
  data: {
    returnId: number
    saleItemId: number
    productId: number
    quantity: number
    unitPrice: string
    lineTotal: string
  }
): void {
  db.prepare(
    `INSERT INTO sale_return_items (
      return_id, sale_item_id, product_id, quantity, unit_price, line_total
    ) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    data.returnId,
    data.saleItemId,
    data.productId,
    data.quantity,
    data.unitPrice,
    data.lineTotal
  )
}

export function addReturnedQuantity(
  db: Database.Database,
  saleItemId: number,
  quantity: number
): void {
  db.prepare(
    `UPDATE sale_items SET returned_quantity = returned_quantity + ? WHERE id = ?`
  ).run(quantity, saleItemId)
}
