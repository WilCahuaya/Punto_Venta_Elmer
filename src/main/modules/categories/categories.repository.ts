import type Database from 'better-sqlite3'
import type { CategoryListFilters } from '@shared/types/catalog'

export interface CategoryRow {
  id: number
  parent_id: number | null
  parent_name: string | null
  name: string
  description: string | null
  is_active: number
  sort_order: number
  created_at: string
  updated_at: string | null
  product_count: number
  subcategory_count: number
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
  if (filters.parentId !== undefined) {
    if (filters.parentId === null) {
      conditions.push('c.parent_id IS NULL')
    } else {
      conditions.push('c.parent_id = ?')
      params.push(filters.parentId)
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  return db
    .prepare(
      `SELECT c.id, c.parent_id, p.name AS parent_name, c.name, c.description,
              c.is_active, c.sort_order, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM products pr WHERE pr.category_id = c.id AND pr.is_active = 1) AS product_count,
              (SELECT COUNT(*) FROM categories sc WHERE sc.parent_id = c.id AND sc.is_active = 1) AS subcategory_count
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       ${where}
       ORDER BY COALESCE(c.parent_id, c.id), c.parent_id IS NOT NULL, c.sort_order ASC, c.name ASC`
    )
    .all(...params) as CategoryRow[]
}

export function getCategoryById(db: Database.Database, id: number): CategoryRow | undefined {
  return db
    .prepare(
      `SELECT c.id, c.parent_id, p.name AS parent_name, c.name, c.description,
              c.is_active, c.sort_order, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM products pr WHERE pr.category_id = c.id AND pr.is_active = 1) AS product_count,
              (SELECT COUNT(*) FROM categories sc WHERE sc.parent_id = c.id AND sc.is_active = 1) AS subcategory_count
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       WHERE c.id = ?`
    )
    .get(id) as CategoryRow | undefined
}

export function getCategoryByNameAndParent(
  db: Database.Database,
  name: string,
  parentId: number | null,
  excludeId?: number
): { id: number } | undefined {
  const parentKey = parentId ?? 0
  if (excludeId) {
    return db
      .prepare(
        'SELECT id FROM categories WHERE name = ? AND COALESCE(parent_id, 0) = ? AND id != ?'
      )
      .get(name, parentKey, excludeId) as { id: number } | undefined
  }
  return db
    .prepare('SELECT id FROM categories WHERE name = ? AND COALESCE(parent_id, 0) = ?')
    .get(name, parentKey) as { id: number } | undefined
}

export function insertCategory(
  db: Database.Database,
  data: {
    parentId: number | null
    name: string
    description: string | null
    sortOrder: number
    isActive: number
  }
): number {
  const result = db
    .prepare(
      `INSERT INTO categories (parent_id, name, description, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(data.parentId, data.name, data.description, data.sortOrder, data.isActive)
  return Number(result.lastInsertRowid)
}

export function updateCategory(
  db: Database.Database,
  id: number,
  data: {
    parentId: number | null
    name: string
    description: string | null
    sortOrder: number
    isActive: number
  }
): void {
  db.prepare(
    `UPDATE categories SET parent_id = ?, name = ?, description = ?, sort_order = ?, is_active = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(data.parentId, data.name, data.description, data.sortOrder, data.isActive, id)
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

export function countActiveSubcategories(db: Database.Database, parentId: number): number {
  const row = db
    .prepare('SELECT COUNT(*) AS c FROM categories WHERE parent_id = ? AND is_active = 1')
    .get(parentId) as { c: number }
  return row.c
}

export function listParentCategories(db: Database.Database): CategoryRow[] {
  return listCategories(db, { includeInactive: false, parentId: null })
}
