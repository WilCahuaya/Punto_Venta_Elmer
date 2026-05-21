import type { ApiResult } from '@shared/types/api'
import type { Category, CategoryInput, CategoryListFilters } from '@shared/types/catalog'
import { getDatabase } from '../../database/connection'
import {
  countProductsInCategory,
  getCategoryById,
  getCategoryByName,
  insertCategory,
  listCategories,
  softDeleteCategory,
  updateCategory,
  type CategoryRow
} from './categories.repository'

function mapRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    productCount: row.product_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function validateInput(input: CategoryInput): string | null {
  if (!input.name?.trim()) return 'El nombre es obligatorio'
  if (input.name.trim().length > 100) return 'El nombre es demasiado largo'
  return null
}

export function listCategoriesService(filters: CategoryListFilters = {}): ApiResult<Category[]> {
  const db = getDatabase()
  const rows = listCategories(db, filters)
  return { ok: true, data: rows.map(mapRow) }
}

export function getCategoryService(id: number): ApiResult<Category> {
  const db = getDatabase()
  const row = getCategoryById(db, id)
  if (!row) return { ok: false, error: 'Categoría no encontrada' }
  return { ok: true, data: mapRow(row) }
}

export function createCategoryService(input: CategoryInput): ApiResult<Category> {
  const err = validateInput(input)
  if (err) return { ok: false, error: err }

  const db = getDatabase()
  const name = input.name.trim()
  if (getCategoryByName(db, name)) {
    return { ok: false, error: 'Ya existe una categoría con ese nombre' }
  }

  const id = insertCategory(db, {
    name,
    description: input.description?.trim() || null,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive === false ? 0 : 1
  })

  return getCategoryService(id)
}

export function updateCategoryService(id: number, input: CategoryInput): ApiResult<Category> {
  const err = validateInput(input)
  if (err) return { ok: false, error: err }

  const db = getDatabase()
  const existing = getCategoryById(db, id)
  if (!existing) return { ok: false, error: 'Categoría no encontrada' }

  const name = input.name.trim()
  if (getCategoryByName(db, name, id)) {
    return { ok: false, error: 'Ya existe una categoría con ese nombre' }
  }

  updateCategory(db, id, {
    name,
    description: input.description?.trim() || null,
    sortOrder: input.sortOrder ?? existing.sort_order,
    isActive: input.isActive === false ? 0 : 1
  })

  return getCategoryService(id)
}

export function deleteCategoryService(id: number): ApiResult<null> {
  const db = getDatabase()
  const existing = getCategoryById(db, id)
  if (!existing) return { ok: false, error: 'Categoría no encontrada' }

  const activeProducts = countProductsInCategory(db, id)
  if (activeProducts > 0) {
    return {
      ok: false,
      error: `No se puede eliminar: tiene ${activeProducts} producto(s) activo(s)`
    }
  }

  softDeleteCategory(db, id)
  return { ok: true, data: null }
}
