import type Database from 'better-sqlite3'
import type { PriceMode } from '@shared/types/sales'
import type { PaymentMethod } from '@shared/lib/payment'

export interface SaleRow {
  id: number
  ticket_number: string
  session_id: number
  subtotal: string
  discount: string
  total: string
  amount_paid: string
  change_amount: string
  payment_method: string
  is_credit: number
  credit_to: string | null
  price_mode: string
  status: string
  created_at: string
}

export interface SaleItemRow {
  id: number
  sale_id: number
  product_id: number
  product_name: string
  barcode: string | null
  quantity: number
  unit_price: string
  line_total: string
  cost_price: string
  stock_quantity: number | null
}

export function generateTicketNumber(db: Database.Database): string {
  const today = db.prepare(`SELECT date('now') AS d`).get() as { d: string }
  const datePart = today.d.replace(/-/g, '')
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM sales WHERE date(created_at) = date('now')`
    )
    .get() as { c: number }
  const seq = String(row.c + 1).padStart(4, '0')
  return `${datePart}-${seq}`
}

export function insertSale(
  db: Database.Database,
  data: {
    ticketNumber: string
    sessionId: number
    subtotal: string
    discount: string
    total: string
    amountPaid: string
    changeAmount: string
    paymentMethod: PaymentMethod
    isCredit?: boolean
    creditTo?: string | null
    priceMode: PriceMode
    createdBy: number
  }
): number {
  const result = db
    .prepare(
      `INSERT INTO sales (
        ticket_number, session_id, subtotal, discount, total,
        amount_paid, change_amount, payment_method, is_credit, credit_to, price_mode, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.ticketNumber,
      data.sessionId,
      data.subtotal,
      data.discount,
      data.total,
      data.amountPaid,
      data.changeAmount,
      data.paymentMethod,
      data.isCredit ? 1 : 0,
      data.creditTo ?? null,
      data.priceMode,
      data.createdBy
    )
  return Number(result.lastInsertRowid)
}

export function insertSaleItem(
  db: Database.Database,
  data: {
    saleId: number
    productId: number
    productName: string
    barcode: string | null
    quantity: number
    unitPrice: string
    lineTotal: string
    costPrice: string
    stockQuantity: number
  }
): void {
  db.prepare(
    `INSERT INTO sale_items (
      sale_id, product_id, product_name, barcode, quantity, unit_price, line_total, cost_price, stock_quantity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.saleId,
    data.productId,
    data.productName,
    data.barcode,
    data.quantity,
    data.unitPrice,
    data.lineTotal,
    data.costPrice,
    data.stockQuantity
  )
}

export function decrementStock(
  db: Database.Database,
  productId: number,
  quantity: number
): boolean {
  const result = db
    .prepare(
      `UPDATE products SET stock = stock - ?, updated_at = datetime('now')
       WHERE id = ? AND stock >= ?`
    )
    .run(quantity, productId, quantity)
  return result.changes > 0
}

export interface SaleRowFull extends SaleRow {
  voided_at: string | null
  void_reason: string | null
  voided_by: number | null
  voided_by_name: string | null
}

export function getSaleById(db: Database.Database, id: number): SaleRowFull | undefined {
  return db
    .prepare(
      `SELECT s.id, s.ticket_number, s.session_id, s.subtotal, s.discount, s.total,
              s.amount_paid, s.change_amount, COALESCE(s.payment_method, 'cash') AS payment_method,
              COALESCE(s.is_credit, 0) AS is_credit, s.credit_to,
              s.price_mode, s.status, s.created_at,
              s.voided_at, s.void_reason, s.voided_by,
              u.display_name AS voided_by_name
       FROM sales s
       LEFT JOIN users u ON u.id = s.voided_by
       WHERE s.id = ?`
    )
    .get(id) as SaleRowFull | undefined
}

export function voidSaleRecord(
  db: Database.Database,
  id: number,
  reason: string,
  voidedBy: number | null
): void {
  db.prepare(
    `UPDATE sales SET status = 'voided', voided_at = datetime('now'), void_reason = ?, voided_by = ?
     WHERE id = ? AND status = 'completed'`
  ).run(reason, voidedBy, id)
}

export function restoreStock(
  db: Database.Database,
  productId: number,
  quantity: number
): void {
  db.prepare(
    `UPDATE products SET stock = stock + ?, updated_at = datetime('now') WHERE id = ?`
  ).run(quantity, productId)
}

export function getSaleItems(db: Database.Database, saleId: number): SaleItemRow[] {
  return db
    .prepare(
      `SELECT id, sale_id, product_id, product_name, barcode, quantity, unit_price, line_total, cost_price,
              COALESCE(stock_quantity, quantity) AS stock_quantity
       FROM sale_items WHERE sale_id = ?`
    )
    .all(saleId) as SaleItemRow[]
}

export interface SaleListRow {
  id: number
  ticket_number: string
  session_id: number
  created_at: string
  subtotal: string
  discount: string
  total: string
  amount_paid: string
  change_amount: string
  payment_method: string
  is_credit: number
  credit_to: string | null
  status: string
  void_reason: string | null
  voided_at: string | null
  voided_by_name: string | null
  returned_total: string
  item_count: number
}

export function listSalesForSession(db: Database.Database, sessionId: number): SaleListRow[] {
  return db
    .prepare(
      `SELECT s.id, s.ticket_number, s.session_id, s.created_at, s.subtotal, s.discount, s.total,
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
       ORDER BY s.created_at DESC`
    )
    .all(sessionId) as SaleListRow[]
}
