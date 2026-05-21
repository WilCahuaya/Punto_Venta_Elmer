import type Database from 'better-sqlite3'
import type { ReportDateRange } from '@shared/types/reports'

export interface SaleListRow {
  id: number
  ticket_number: string
  created_at: string
  subtotal: string
  discount: string
  total: string
  status: string
  void_reason: string | null
  voided_at: string | null
  item_count: number
}

export interface TopProductRow {
  product_id: number
  product_name: string
  qty: number
  revenue: string
}

export interface SummaryRow {
  completed_count: number
  completed_total: string
  profit: string
  voided_count: number
  voided_total: string
}

export function getReportSummary(
  db: Database.Database,
  range: ReportDateRange
): SummaryRow {
  return db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM sales s WHERE s.status = 'completed'
         AND date(s.created_at) BETWEEN date(?) AND date(?)) AS completed_count,
        (SELECT COALESCE(SUM(total), 0) FROM sales s WHERE s.status = 'completed'
         AND date(s.created_at) BETWEEN date(?) AND date(?)) AS completed_total,
        (SELECT COALESCE(SUM(si.line_total - si.cost_price * si.quantity), 0)
         FROM sale_items si INNER JOIN sales s ON s.id = si.sale_id
         WHERE s.status = 'completed' AND date(s.created_at) BETWEEN date(?) AND date(?)) AS profit,
        (SELECT COUNT(*) FROM sales s WHERE s.status = 'voided'
         AND date(s.created_at) BETWEEN date(?) AND date(?)) AS voided_count,
        (SELECT COALESCE(SUM(total), 0) FROM sales s WHERE s.status = 'voided'
         AND date(s.created_at) BETWEEN date(?) AND date(?)) AS voided_total`
    )
    .get(
      range.dateFrom,
      range.dateTo,
      range.dateFrom,
      range.dateTo,
      range.dateFrom,
      range.dateTo,
      range.dateFrom,
      range.dateTo,
      range.dateFrom,
      range.dateTo
    ) as SummaryRow
}

export function listSalesInRange(
  db: Database.Database,
  range: ReportDateRange,
  status: 'completed' | 'voided'
): SaleListRow[] {
  return db
    .prepare(
      `SELECT s.id, s.ticket_number, s.created_at, s.subtotal, s.discount, s.total,
              s.status, s.void_reason, s.voided_at,
              (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) AS item_count
       FROM sales s
       WHERE s.status = ? AND date(s.created_at) BETWEEN date(?) AND date(?)
       ORDER BY s.created_at DESC`
    )
    .all(status, range.dateFrom, range.dateTo) as SaleListRow[]
}

export function getTopProductsInRange(
  db: Database.Database,
  range: ReportDateRange,
  limit = 15
): TopProductRow[] {
  return db
    .prepare(
      `SELECT si.product_id, si.product_name, SUM(si.quantity) AS qty,
              SUM(si.line_total) AS revenue
       FROM sale_items si
       INNER JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'completed'
         AND date(s.created_at) BETWEEN date(?) AND date(?)
       GROUP BY si.product_id, si.product_name
       ORDER BY revenue DESC
       LIMIT ?`
    )
    .all(range.dateFrom, range.dateTo, limit) as TopProductRow[]
}
