import type Database from 'better-sqlite3'
import type { ProductListFilters } from '@shared/types/catalog'

export interface ProductRow {
  id: number
  name: string
  barcode: string | null
  category_id: number | null
  category_name: string | null
  stock: number
  stock_min: number
  size: string | null
  color: string | null
  cost_price: string
  price_retail: string
  price_wholesale: string
  image_path: string | null
  is_active: number
  created_at: string
  updated_at: string | null
}

const SELECT_FIELDS = `
  p.id, p.name, p.barcode, p.category_id, c.name AS category_name,
  p.stock, p.stock_min, p.size, p.color,
  p.cost_price, p.price_retail, p.price_wholesale,
  p.image_path, p.is_active, p.created_at, p.updated_at
`

export function listProducts(db: Database.Database, filters: ProductListFilters): ProductRow[] {
  const conditions: string[] = []
  const params: unknown[] = []

  if (!filters.includeInactive) {
    conditions.push('p.is_active = 1')
  }
  if (filters.search?.trim()) {
    conditions.push('(p.name LIKE ? OR p.barcode LIKE ?)')
    const q = `%${filters.search.trim()}%`
    params.push(q, q)
  }
  if (filters.categoryId) {
    conditions.push('p.category_id = ?')
    params.push(filters.categoryId)
  }
  if (filters.lowStockOnly) {
    conditions.push('p.stock <= p.stock_min')
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  return db
    .prepare(
      `SELECT ${SELECT_FIELDS}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.name ASC`
    )
    .all(...params) as ProductRow[]
}

export function getProductById(db: Database.Database, id: number): ProductRow | undefined {
  return db
    .prepare(
      `SELECT ${SELECT_FIELDS}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`
    )
    .get(id) as ProductRow | undefined
}

export function getProductByBarcodeRow(db: Database.Database, barcode: string): ProductRow | undefined {
  return db
    .prepare(
      `SELECT ${SELECT_FIELDS}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.barcode = ? AND p.is_active = 1`
    )
    .get(barcode) as ProductRow | undefined
}

export function searchProductsPos(db: Database.Database, query: string, limit = 15): ProductRow[] {
  const q = `%${query.trim()}%`
  return db
    .prepare(
      `SELECT ${SELECT_FIELDS}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = 1 AND (p.name LIKE ? OR p.barcode LIKE ?)
       ORDER BY p.name ASC
       LIMIT ?`
    )
    .all(q, q, limit) as ProductRow[]
}

export function getProductByBarcode(
  db: Database.Database,
  barcode: string,
  excludeId?: number
): { id: number } | undefined {
  if (excludeId) {
    return db
      .prepare('SELECT id FROM products WHERE barcode = ? AND id != ?')
      .get(barcode, excludeId) as { id: number } | undefined
  }
  return db.prepare('SELECT id FROM products WHERE barcode = ?').get(barcode) as
    | { id: number }
    | undefined
}

export function insertProduct(
  db: Database.Database,
  data: {
    name: string
    barcode: string | null
    categoryId: number | null
    stock: number
    stockMin: number
    size: string | null
    color: string | null
    costPrice: string
    priceRetail: string
    priceWholesale: string
    imagePath: string | null
    isActive: number
  }
): number {
  const result = db
    .prepare(
      `INSERT INTO products (
        name, barcode, category_id, stock, stock_min, size, color,
        cost_price, price_retail, price_wholesale, image_path, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.name,
      data.barcode,
      data.categoryId,
      data.stock,
      data.stockMin,
      data.size,
      data.color,
      data.costPrice,
      data.priceRetail,
      data.priceWholesale,
      data.imagePath,
      data.isActive
    )
  return Number(result.lastInsertRowid)
}

export function updateProduct(
  db: Database.Database,
  id: number,
  data: {
    name: string
    barcode: string | null
    categoryId: number | null
    stock: number
    stockMin: number
    size: string | null
    color: string | null
    costPrice: string
    priceRetail: string
    priceWholesale: string
    imagePath: string | null
    isActive: number
  }
): void {
  db.prepare(
    `UPDATE products SET
      name = ?, barcode = ?, category_id = ?, stock = ?, stock_min = ?,
      size = ?, color = ?, cost_price = ?, price_retail = ?, price_wholesale = ?,
      image_path = ?, is_active = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    data.name,
    data.barcode,
    data.categoryId,
    data.stock,
    data.stockMin,
    data.size,
    data.color,
    data.costPrice,
    data.priceRetail,
    data.priceWholesale,
    data.imagePath,
    data.isActive,
    id
  )
}

export function updateProductImagePath(db: Database.Database, id: number, imagePath: string | null): void {
  db.prepare(`UPDATE products SET image_path = ?, updated_at = datetime('now') WHERE id = ?`).run(
    imagePath,
    id
  )
}

export function softDeleteProduct(db: Database.Database, id: number): void {
  db.prepare(`UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(id)
}

export function countLowStockProducts(db: Database.Database): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM products WHERE is_active = 1 AND stock <= stock_min`
    )
    .get() as { c: number }
  return row.c
}
