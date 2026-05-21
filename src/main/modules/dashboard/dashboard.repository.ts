import type Database from 'better-sqlite3'

export interface DailySalesRow {
  total: string
  count: number
}

export interface TopProductRow {
  product_id: number
  product_name: string
  qty: number
  revenue: string
}

export interface LowStockRow {
  id: number
  name: string
  barcode: string | null
  stock: number
  stock_min: number
  category_name: string | null
}

export function getDailySales(db: Database.Database): DailySalesRow {
  return db
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
       FROM sales
       WHERE status = 'completed' AND date(created_at) = date('now')`
    )
    .get() as DailySalesRow
}

export function getDailyProfit(db: Database.Database): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(si.line_total - (si.cost_price * si.quantity)), 0) AS profit
       FROM sale_items si
       INNER JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'completed' AND date(s.created_at) = date('now')`
    )
    .get() as { profit: string }
  return Number(row.profit)
}

export function getTopProductsToday(db: Database.Database, limit = 5): TopProductRow[] {
  return db
    .prepare(
      `SELECT si.product_id, si.product_name, SUM(si.quantity) AS qty,
              SUM(si.line_total) AS revenue
       FROM sale_items si
       INNER JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'completed' AND date(s.created_at) = date('now')
       GROUP BY si.product_id, si.product_name
       ORDER BY qty DESC
       LIMIT ?`
    )
    .all(limit) as TopProductRow[]
}

export function getLowStockProducts(db: Database.Database, limit = 10): LowStockRow[] {
  return db
    .prepare(
      `SELECT p.id, p.name, p.barcode, p.stock, p.stock_min, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = 1 AND p.stock <= p.stock_min
       ORDER BY p.stock ASC, p.name ASC
       LIMIT ?`
    )
    .all(limit) as LowStockRow[]
}

export function getTodayDate(db: Database.Database): string {
  const row = db.prepare(`SELECT date('now') AS d`).get() as { d: string }
  return row.d
}
