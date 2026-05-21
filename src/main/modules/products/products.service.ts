import type { ApiResult } from '@shared/types/api'
import type { Product, ProductInput, ProductListFilters } from '@shared/types/catalog'
import { getDatabase } from '../../database/connection'
import {
  deleteImageIfExists,
  getImageMediaUrl,
  pickImageFile,
  storeProductImage
} from '../../services/image.service'
import { fromMoneyDb, toMoneyDb } from '../../utils/money-db'
import {
  getProductByBarcode,
  getProductById,
  insertProduct,
  listProducts,
  searchProductsPos,
  softDeleteProduct,
  updateProduct,
  updateProductImagePath
} from './products.repository'
import { mapProductRow } from './products.mapper'

function normalizeBarcode(barcode?: string | null): string | null {
  const v = barcode?.trim()
  return v ? v : null
}

function validateProductInput(input: ProductInput, isUpdate = false): string | null {
  if (!input.name?.trim()) return 'El nombre es obligatorio'
  if (input.priceRetail == null || input.priceWholesale == null) {
    return 'Los precios menor y mayor son obligatorios'
  }
  if (input.priceRetail < 0 || input.priceWholesale < 0 || (input.costPrice ?? 0) < 0) {
    return 'Los precios no pueden ser negativos'
  }
  if ((input.stock ?? 0) < 0 || (input.stockMin ?? 0) < 0) {
    return 'El stock no puede ser negativo'
  }
  if (!isUpdate && input.priceWholesale > input.priceRetail) {
    // allow wholesale > retail? Usually wholesale is lower - warn but allow for flexibility
  }
  return null
}

function buildProductData(input: ProductInput, imagePath: string | null) {
  return {
    name: input.name.trim(),
    barcode: normalizeBarcode(input.barcode),
    categoryId: input.categoryId ?? null,
    stock: input.stock ?? 0,
    stockMin: input.stockMin ?? 0,
    size: input.size?.trim() || null,
    color: input.color?.trim() || null,
    costPrice: toMoneyDb(input.costPrice ?? 0),
    priceRetail: toMoneyDb(input.priceRetail),
    priceWholesale: toMoneyDb(input.priceWholesale),
    imagePath,
    isActive: input.isActive === false ? 0 : 1
  }
}

function handleImage(
  productId: number,
  currentPath: string | null,
  pendingImagePath?: string | null,
  removeImage?: boolean
): string | null {
  if (removeImage) {
    deleteImageIfExists(currentPath)
    return null
  }
  if (pendingImagePath) {
    deleteImageIfExists(currentPath)
    return storeProductImage(pendingImagePath, productId)
  }
  return currentPath
}

export function listProductsService(filters: ProductListFilters = {}): ApiResult<Product[]> {
  const db = getDatabase()
  return { ok: true, data: listProducts(db, filters).map(mapProductRow) }
}

export function getProductService(id: number): ApiResult<Product> {
  const db = getDatabase()
  const row = getProductById(db, id)
  if (!row) return { ok: false, error: 'Producto no encontrado' }
  return { ok: true, data: mapProductRow(row) }
}

export function createProductService(input: ProductInput): ApiResult<Product> {
  const err = validateProductInput(input)
  if (err) return { ok: false, error: err }

  const db = getDatabase()
  const barcode = normalizeBarcode(input.barcode)
  if (barcode && getProductByBarcode(db, barcode)) {
    return { ok: false, error: 'El código de barras ya está registrado' }
  }

  if (input.categoryId) {
    const cat = db.prepare('SELECT id FROM categories WHERE id = ? AND is_active = 1').get(input.categoryId)
    if (!cat) return { ok: false, error: 'Categoría no válida' }
  }

  const data = buildProductData(input, null)
  const id = insertProduct(db, data)

  if (input.pendingImagePath) {
    try {
      const imagePath = storeProductImage(input.pendingImagePath, id)
      updateProductImagePath(db, id, imagePath)
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Error al guardar imagen' }
    }
  }

  return getProductService(id)
}

export function updateProductService(id: number, input: ProductInput): ApiResult<Product> {
  const err = validateProductInput(input, true)
  if (err) return { ok: false, error: err }

  const db = getDatabase()
  const existing = getProductById(db, id)
  if (!existing) return { ok: false, error: 'Producto no encontrado' }

  const barcode = normalizeBarcode(input.barcode)
  if (barcode && getProductByBarcode(db, barcode, id)) {
    return { ok: false, error: 'El código de barras ya está registrado' }
  }

  if (input.categoryId) {
    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(input.categoryId)
    if (!cat) return { ok: false, error: 'Categoría no válida' }
  }

  let imagePath = existing.image_path
  try {
    imagePath = handleImage(id, existing.image_path, input.pendingImagePath, input.removeImage)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al guardar imagen' }
  }

  const data = buildProductData(input, imagePath)
  updateProduct(db, id, data)

  return getProductService(id)
}

export function deleteProductService(id: number): ApiResult<null> {
  const db = getDatabase()
  const existing = getProductById(db, id)
  if (!existing) return { ok: false, error: 'Producto no encontrado' }

  softDeleteProduct(db, id)
  return { ok: true, data: null }
}

export async function pickProductImageService(): Promise<ApiResult<string | null>> {
  const path = await pickImageFile()
  return { ok: true, data: path }
}

export function getProductImageUrlService(relativePath: string | null): ApiResult<string | null> {
  return { ok: true, data: getImageMediaUrl(relativePath) }
}

export function searchProductsPosService(query: string): ApiResult<Product[]> {
  if (!query.trim()) return { ok: true, data: [] }
  const db = getDatabase()
  const rows = searchProductsPos(db, query.trim())
  return { ok: true, data: rows.map(mapProductRow) }
}
