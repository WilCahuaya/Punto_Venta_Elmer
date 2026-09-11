import type Database from 'better-sqlite3'
import type { CreditListFilters, CreditPaymentKind } from '@shared/types/sales'
import type { PaymentMethod } from '@shared/lib/payment'

export const CREDIT_PAID_SQL = `(
  SELECT COALESCE(SUM(CASE WHEN p.kind = 'refund' THEN -p.amount ELSE p.amount END), 0)
  FROM sale_credit_payments p
  WHERE p.sale_id = s.id
)`

export interface CreditPaymentRow {
  id: number
  sale_id: number
  session_id: number
  amount: string
  payment_method: string
  kind: string
  created_at: string
  created_by_name: string | null
  ticket_number?: string | null
  credit_to?: string | null
}

export interface CreditSaleListRow {
  id: number
  ticket_number: string
  credit_to: string
  created_at: string
  total: string
  returned_total: string
  paid_total: string
}

export interface CreditSaleItemRow {
  product_name: string
  quantity: number
  returned_quantity: number
  unit_price: string
  line_total: string
}

export function insertCreditPayment(
  db: Database.Database,
  data: {
    saleId: number
    sessionId: number
    amount: string
    paymentMethod: PaymentMethod
    kind: CreditPaymentKind
    createdBy: number | null
  }
): number {
  const result = db
    .prepare(
      `INSERT INTO sale_credit_payments (
        sale_id, session_id, amount, payment_method, kind, created_by
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.saleId,
      data.sessionId,
      data.amount,
      data.paymentMethod,
      data.kind,
      data.createdBy
    )
  return Number(result.lastInsertRowid)
}

export function getCreditPaidTotal(db: Database.Database, saleId: number): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN kind = 'refund' THEN -amount ELSE amount END), 0) AS total
       FROM sale_credit_payments WHERE sale_id = ?`
    )
    .get(saleId) as { total: string }
  return Number(row.total)
}

export function getCreditPaidByMethod(
  db: Database.Database,
  saleId: number,
  method: PaymentMethod
): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN kind = 'refund' THEN -amount ELSE amount END), 0) AS total
       FROM sale_credit_payments WHERE sale_id = ? AND payment_method = ?`
    )
    .get(saleId, method) as { total: string }
  return Number(row.total)
}

export function countCreditPayments(db: Database.Database, saleId: number): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM sale_credit_payments WHERE sale_id = ? AND kind = 'payment'`)
    .get(saleId) as { c: number }
  return row.c
}

export function listCreditPayments(db: Database.Database, saleId: number): CreditPaymentRow[] {
  return db
    .prepare(
      `SELECT p.id, p.sale_id, p.session_id, p.amount, p.payment_method, p.kind, p.created_at,
              u.display_name AS created_by_name
       FROM sale_credit_payments p
       LEFT JOIN users u ON u.id = p.created_by
       WHERE p.sale_id = ?
       ORDER BY p.created_at ASC, p.id ASC`
    )
    .all(saleId) as CreditPaymentRow[]
}

export function listCreditPaymentsForSession(
  db: Database.Database,
  sessionId: number
): CreditPaymentRow[] {
  return db
    .prepare(
      `SELECT p.id, p.sale_id, p.session_id, p.amount, p.payment_method, p.kind, p.created_at,
              u.display_name AS created_by_name,
              s.ticket_number, s.credit_to
       FROM sale_credit_payments p
       LEFT JOIN users u ON u.id = p.created_by
       LEFT JOIN sales s ON s.id = p.sale_id
       WHERE p.session_id = ?
       ORDER BY p.created_at DESC, p.id DESC`
    )
    .all(sessionId) as CreditPaymentRow[]
}

export function sumCreditPaymentsInSession(
  db: Database.Database,
  sessionId: number,
  paymentMethod?: PaymentMethod
): number {
  const methodClause = paymentMethod ? `AND payment_method = ?` : ''
  const stmt = db.prepare(
    `SELECT COALESCE(SUM(CASE WHEN kind = 'refund' THEN -amount ELSE amount END), 0) AS total
     FROM sale_credit_payments
     WHERE session_id = ? ${methodClause}`
  )
  const row = (
    paymentMethod ? stmt.get(sessionId, paymentMethod) : stmt.get(sessionId)
  ) as { total: string }
  return Number(row.total)
}

export function updateSaleAmountPaid(
  db: Database.Database,
  saleId: number,
  amountPaid: string
): void {
  db.prepare(`UPDATE sales SET amount_paid = ? WHERE id = ?`).run(amountPaid, saleId)
}

export function listCreditSales(
  db: Database.Database,
  filters: CreditListFilters
): CreditSaleListRow[] {
  const search = filters.search?.trim() ?? ''
  const includeSettled = filters.includeSettled === true
  const params: Array<string | number> = []

  let searchClause = ''
  if (search) {
    searchClause = `AND (
      s.credit_to LIKE ?
      OR s.ticket_number LIKE ?
      OR EXISTS (
        SELECT 1 FROM sale_items si
        WHERE si.sale_id = s.id AND si.product_name LIKE ?
      )
    )`
    const like = `%${search}%`
    params.push(like, like, like)
  }

  const remainingClause = includeSettled
    ? ''
    : `AND (s.total - (
         SELECT COALESCE(SUM(sri.line_total), 0)
         FROM sale_return_items sri
         INNER JOIN sale_returns sr ON sr.id = sri.return_id
         WHERE sr.sale_id = s.id
       ) - ${CREDIT_PAID_SQL}) > 0.004`

  return db
    .prepare(
      `SELECT s.id, s.ticket_number, COALESCE(s.credit_to, '') AS credit_to, s.created_at, s.total,
              (SELECT COALESCE(SUM(sri.line_total), 0)
               FROM sale_return_items sri
               INNER JOIN sale_returns sr ON sr.id = sri.return_id
               WHERE sr.sale_id = s.id) AS returned_total,
              ${CREDIT_PAID_SQL} AS paid_total
       FROM sales s
       WHERE COALESCE(s.is_credit, 0) = 1
         AND s.status = 'completed'
         ${searchClause}
         ${remainingClause}
       ORDER BY s.created_at DESC`
    )
    .all(...params) as CreditSaleListRow[]
}

export function getCreditSaleRow(
  db: Database.Database,
  saleId: number
): CreditSaleListRow | undefined {
  return db
    .prepare(
      `SELECT s.id, s.ticket_number, COALESCE(s.credit_to, '') AS credit_to, s.created_at, s.total,
              (SELECT COALESCE(SUM(sri.line_total), 0)
               FROM sale_return_items sri
               INNER JOIN sale_returns sr ON sr.id = sri.return_id
               WHERE sr.sale_id = s.id) AS returned_total,
              ${CREDIT_PAID_SQL} AS paid_total
       FROM sales s
       WHERE s.id = ? AND COALESCE(s.is_credit, 0) = 1`
    )
    .get(saleId) as CreditSaleListRow | undefined
}

export function listCreditSaleItems(
  db: Database.Database,
  saleId: number
): CreditSaleItemRow[] {
  return db
    .prepare(
      `SELECT product_name, quantity, COALESCE(returned_quantity, 0) AS returned_quantity,
              unit_price, line_total
       FROM sale_items WHERE sale_id = ?`
    )
    .all(saleId) as CreditSaleItemRow[]
}
