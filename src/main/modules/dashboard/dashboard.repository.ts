import type Database from 'better-sqlite3'

export interface LowStockRow {
  id: number
  name: string
  barcode: string | null
  stock: number
  stock_min: number
  category_name: string | null
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
