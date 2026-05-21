import type { ApiResult } from '@shared/types/api'
import type { Category, CategoryInput, CategoryListFilters } from '@shared/types/catalog'
import { getDatabase } from '../../database/connection'
import {
  countActiveSubcategories,
  countProductsInCategory,
  getCategoryById,
  getCategoryByNameAndParent,
  insertCategory,
  listCategories,
  softDeleteCategory,
  updateCategory,
  type CategoryRow
} from './categories.repository'

function mapRow(row: CategoryRow): Category {
  return {
    id: row.id,
    parentId: row.parent_id,
    parentName: row.parent_name,
    name: row.name,
    description: row.description,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    productCount: row.product_count,
    subcategoryCount: row.subcategory_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function validateInput(input: CategoryInput, categoryId?: number): string | null {
  if (!input.name?.trim()) return 'El nombre es obligatorio'
  if (input.name.trim().length > 100) return 'El nombre es demasiado largo'

  const parentId = input.parentId ?? null
  if (parentId != null) {
    if (categoryId && parentId === categoryId) {
      return 'Una categoría no puede ser subcategoría de sí misma'
    }
    const db = getDatabase()
    const parent = getCategoryById(db, parentId)
    if (!parent || parent.is_active !== 1) return 'La categoría padre no es válida'
    if (parent.parent_id != null) return 'Solo se permiten subcategorías de un nivel (categoría principal)'
  }
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
  const parentId = input.parentId ?? null

  if (getCategoryByNameAndParent(db, name, parentId)) {
    return { ok: false, error: 'Ya existe una categoría con ese nombre en el mismo nivel' }
  }

  const id = insertCategory(db, {
    parentId,
    name,
    description: input.description?.trim() || null,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive === false ? 0 : 1
  })

  return getCategoryService(id)
}

export function updateCategoryService(id: number, input: CategoryInput): ApiResult<Category> {
  const err = validateInput(input, id)
  if (err) return { ok: false, error: err }

  const db = getDatabase()
  const existing = getCategoryById(db, id)
  if (!existing) return { ok: false, error: 'Categoría no encontrada' }

  const name = input.name.trim()
  const parentId = input.parentId ?? null

  if (getCategoryByNameAndParent(db, name, parentId, id)) {
    return { ok: false, error: 'Ya existe una categoría con ese nombre en el mismo nivel' }
  }

  if (parentId != null && countActiveSubcategories(db, id) > 0) {
    return {
      ok: false,
      error: 'No puede convertir una categoría con subcategorías en subcategoría'
    }
  }

  updateCategory(db, id, {
    parentId,
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

  const subs = countActiveSubcategories(db, id)
  if (subs > 0) {
    return {
      ok: false,
      error: `No se puede eliminar: tiene ${subs} subcategoría(s) activa(s)`
    }
  }

  softDeleteCategory(db, id)
  return { ok: true, data: null }
}
