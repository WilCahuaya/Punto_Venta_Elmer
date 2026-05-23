import type Database from 'better-sqlite3'
import type { ProductListFilters } from '@shared/types/catalog'
import { systemServiceExcludeSql } from './system-product'

export interface ProductRow {
  id: number
  product_code: string | null
  name: string
  barcode: string | null
  category_id: number | null
  category_name: string | null
  stock: number
  stock_min: number
  brand: string | null
  size: string | null
  color: string | null
  description: string | null
  cost_price: string
  price_retail: string
  price_wholesale: string
  image_path: string | null
  is_active: number
  created_at: string
  updated_at: string | null
}

const SELECT_FIELDS = `
  p.id, p.product_code, p.name, p.barcode, p.category_id, c.name AS category_name,
  p.stock, p.stock_min, p.brand, p.size, p.color, p.description,
  p.cost_price, p.price_retail, p.price_wholesale,
  p.image_path, p.is_active, p.created_at, p.updated_at
`

export function listProducts(db: Database.Database, filters: ProductListFilters): ProductRow[] {
  const conditions: string[] = [systemServiceExcludeSql('p')]
  const params: unknown[] = []

  if (!filters.includeInactive) {
    conditions.push('p.is_active = 1')
  }
  if (filters.search?.trim()) {
    conditions.push('(p.name LIKE ? OR p.barcode LIKE ? OR p.product_code LIKE ?)')
    const q = `%${filters.search.trim()}%`
    params.push(q, q, q)
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
       WHERE p.is_active = 1 AND ${systemServiceExcludeSql('p')}
         AND (p.name LIKE ? OR p.barcode LIKE ? OR p.product_code LIKE ?)
       ORDER BY p.name ASC
       LIMIT ?`
    )
    .all(q, q, q, limit) as ProductRow[]
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

export function getProductByCode(
  db: Database.Database,
  productCode: string,
  excludeId?: number
): { id: number } | undefined {
  if (excludeId) {
    return db
      .prepare('SELECT id FROM products WHERE product_code = ? AND id != ?')
      .get(productCode, excludeId) as { id: number } | undefined
  }
  return db.prepare('SELECT id FROM products WHERE product_code = ?').get(productCode) as
    | { id: number }
    | undefined
}

export function insertProduct(
  db: Database.Database,
  data: {
    productCode: string | null
    name: string
    barcode: string | null
    categoryId: number | null
    stock: number
    stockMin: number
    brand: string | null
    size: string | null
    color: string | null
    description: string | null
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
        product_code, name, barcode, category_id, stock, stock_min, brand, size, color, description,
        cost_price, price_retail, price_wholesale, image_path, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.productCode,
      data.name,
      data.barcode,
      data.categoryId,
      data.stock,
      data.stockMin,
      data.brand,
      data.size,
      data.color,
      data.description,
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
    productCode: string | null
    name: string
    barcode: string | null
    categoryId: number | null
    stock: number
    stockMin: number
    brand: string | null
    size: string | null
    color: string | null
    description: string | null
    costPrice: string
    priceRetail: string
    priceWholesale: string
    imagePath: string | null
    isActive: number
  }
): void {
  db.prepare(
    `UPDATE products SET
      product_code = ?, name = ?, barcode = ?, category_id = ?, stock = ?, stock_min = ?,
      brand = ?, size = ?, color = ?, description = ?,
      cost_price = ?, price_retail = ?, price_wholesale = ?,
      image_path = ?, is_active = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    data.productCode,
    data.name,
    data.barcode,
    data.categoryId,
    data.stock,
    data.stockMin,
    data.brand,
    data.size,
    data.color,
    data.description,
    data.costPrice,
    data.priceRetail,
    data.priceWholesale,
    data.imagePath,
    data.isActive,
    id
  )
}

export function updateProductStock(db: Database.Database, id: number, stock: number): void {
  db.prepare(`UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?`).run(stock, id)
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

export function countSaleItemsForProduct(db: Database.Database, productId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) AS c FROM sale_items WHERE product_id = ?')
    .get(productId) as { c: number }
  return row.c
}

export function hardDeleteProduct(db: Database.Database, id: number): boolean {
  const result = db
    .prepare('DELETE FROM products WHERE id = ? AND is_active = 0')
    .run(id)
  return result.changes > 0
}

export function countLowStockProducts(db: Database.Database): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM products WHERE is_active = 1 AND stock <= stock_min`
    )
    .get() as { c: number }
  return row.c
}
