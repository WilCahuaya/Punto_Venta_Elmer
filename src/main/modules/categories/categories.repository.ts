import type Database from 'better-sqlite3'
import type { CategoryListFilters } from '@shared/types/catalog'

export interface CategoryRow {
  id: number
  name: string
  description: string | null
  is_active: number
  sort_order: number
  created_at: string
  updated_at: string | null
  product_count: number
}

export function listCategories(db: Database.Database, filters: CategoryListFilters): CategoryRow[] {
  const conditions: string[] = []
  const params: unknown[] = []

  if (!filters.includeInactive) {
    conditions.push('c.is_active = 1')
  }
  if (filters.search?.trim()) {
    conditions.push('(c.name LIKE ? OR c.description LIKE ?)')
    const q = `%${filters.search.trim()}%`
    params.push(q, q)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  return db
    .prepare(
      `SELECT c.id, c.name, c.description, c.is_active, c.sort_order, c.created_at, c.updated_at,
              COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
       ${where}
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name ASC`
    )
    .all(...params) as CategoryRow[]
}

export function getCategoryById(db: Database.Database, id: number): CategoryRow | undefined {
  return db
    .prepare(
      `SELECT c.id, c.name, c.description, c.is_active, c.sort_order, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
       FROM categories c WHERE c.id = ?`
    )
    .get(id) as CategoryRow | undefined
}

export function getCategoryByName(db: Database.Database, name: string, excludeId?: number): CategoryRow | undefined {
  if (excludeId) {
    return db
      .prepare('SELECT id, name FROM categories WHERE name = ? AND id != ?')
      .get(name, excludeId) as CategoryRow | undefined
  }
  return db.prepare('SELECT id, name FROM categories WHERE name = ?').get(name) as CategoryRow | undefined
}

export function insertCategory(
  db: Database.Database,
  data: { name: string; description: string | null; sortOrder: number; isActive: number }
): number {
  const result = db
    .prepare(
      `INSERT INTO categories (name, description, sort_order, is_active)
       VALUES (?, ?, ?, ?)`
    )
    .run(data.name, data.description, data.sortOrder, data.isActive)
  return Number(result.lastInsertRowid)
}

export function updateCategory(
  db: Database.Database,
  id: number,
  data: { name: string; description: string | null; sortOrder: number; isActive: number }
): void {
  db.prepare(
    `UPDATE categories SET name = ?, description = ?, sort_order = ?, is_active = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(data.name, data.description, data.sortOrder, data.isActive, id)
}

export function softDeleteCategory(db: Database.Database, id: number): void {
  db.prepare(
    `UPDATE categories SET is_active = 0, updated_at = datetime('now') WHERE id = ?`
  ).run(id)
}

export function countProductsInCategory(db: Database.Database, categoryId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) AS c FROM products WHERE category_id = ? AND is_active = 1')
    .get(categoryId) as { c: number }
  return row.c
}
