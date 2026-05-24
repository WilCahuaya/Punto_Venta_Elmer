import type { ApiResult } from '@shared/types/api'
import type {
  AdjustStockInput,
  Product,
  ProductInput,
  ProductListFilters
} from '@shared/types/catalog'
import { getDatabase } from '../../database/connection'
import {
  deleteImageIfExists,
  getImageMediaUrl,
  pickImageFile,
  storeProductImage
} from '../../services/image.service'
import { normalizeScannedBarcode } from '@shared/lib/product-barcode'
import { generateBarcodeForProduct, generateProductCode } from '../../utils/barcode'
import { toMoneyDb } from '../../utils/money-db'
import {
  getProductByBarcode,
  getProductByBarcodeRow,
  getProductByCode,
  getProductById,
  insertProduct,
  listProducts,
  searchProductsPos,
  countSaleItemsForProduct,
  hardDeleteProduct,
  softDeleteProduct,
  updateProduct,
  updateProductImagePath,
  updateProductStock
} from './products.repository'
import { mapProductRow } from './products.mapper'
import { ensureSystemServiceProduct } from './system-product'

function normalizeBarcode(barcode?: string | null): string | null {
  const v = barcode?.trim()
  if (!v) return null
  return normalizeScannedBarcode(v)
}

function normalizeProductCode(code?: string | null): string | null {
  const v = code?.trim()
  return v ? v : null
}

function validateProductInput(input: ProductInput, isUpdate = false): string | null {
  if (!input.name?.trim()) return 'El nombre es obligatorio'
  if (input.categoryId == null || input.categoryId <= 0) {
    return 'La categoría es obligatoria'
  }
  const cost = input.costPrice ?? 0
  if (cost < 0) return 'El precio de compra no puede ser negativo'
  if (!isUpdate && cost <= 0) {
    return 'El precio de compra es obligatorio y debe ser mayor a cero'
  }
  if (input.priceRetail == null || input.priceRetail <= 0) {
    return 'El precio por menor es obligatorio y debe ser mayor a cero'
  }
  const wholesale = input.priceWholesale
  if (!isUpdate && (wholesale == null || wholesale <= 0)) {
    return 'El precio por mayor es obligatorio y debe ser mayor a cero'
  }
  if (wholesale != null && wholesale < 0) return 'El precio por mayor no puede ser negativo'
  if ((input.stock ?? 0) < 0 || (input.stockMin ?? 0) < 0) {
    return 'El stock no puede ser negativo'
  }
  if (!isUpdate && wholesale != null && wholesale > input.priceRetail) {
    // permitido
  }
  return null
}

function buildProductData(input: ProductInput, imagePath: string | null, productCode: string | null) {
  const wholesale =
    input.priceWholesale != null && input.priceWholesale > 0
      ? toMoneyDb(input.priceWholesale)
      : toMoneyDb(0)

  return {
    productCode,
    name: input.name.trim(),
    barcode: normalizeBarcode(input.barcode),
    categoryId: input.categoryId ?? null,
    stock: input.stock ?? 0,
    stockMin: input.stockMin ?? 0,
    brand: input.brand?.trim() || null,
    size: input.size?.trim() || null,
    color: input.color?.trim() || null,
    description: input.description?.trim() || null,
    costPrice: toMoneyDb(input.costPrice ?? 0),
    priceRetail: toMoneyDb(input.priceRetail),
    priceWholesale: wholesale,
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

export function lookupProductByBarcodeService(barcode: string): ApiResult<Product> {
  const raw = barcode.trim()
  if (!raw) return { ok: false, error: 'Código vacío' }

  const candidates = [raw]
  const normalized = normalizeScannedBarcode(raw)
  if (normalized !== raw) candidates.push(normalized)

  const db = getDatabase()
  for (const code of candidates) {
    const row = getProductByBarcodeRow(db, code)
    if (row) return { ok: true, data: mapProductRow(row) }
  }

  return { ok: false, error: 'Producto no encontrado' }
}

export function adjustStockService(input: AdjustStockInput): ApiResult<Product> {
  if (input.stock < 0) return { ok: false, error: 'El stock no puede ser negativo' }
  const db = getDatabase()
  const existing = getProductById(db, input.productId)
  if (!existing) return { ok: false, error: 'Producto no encontrado' }
  if (input.stock < existing.stock) {
    return {
      ok: false,
      error: `No puede reducir el stock por debajo del actual (${existing.stock})`
    }
  }
  updateProductStock(db, input.productId, input.stock)
  return getProductService(input.productId)
}

export function createProductService(input: ProductInput): ApiResult<Product> {
  const err = validateProductInput(input)
  if (err) return { ok: false, error: err }

  const db = getDatabase()

  let barcode = normalizeBarcode(input.barcode)
  if (!barcode && !input.skipAutoBarcode) {
    barcode = generateBarcodeForProduct(db, input.categoryId ?? null, input.name)
  }
  if (barcode && getProductByBarcode(db, barcode)) {
    return { ok: false, error: 'El código de barras ya está registrado' }
  }

  const productCode = generateProductCode(db)
  if (getProductByCode(db, productCode)) {
    return { ok: false, error: 'El código de producto ya está registrado' }
  }

  if (input.categoryId) {
    const cat = db.prepare('SELECT id FROM categories WHERE id = ? AND is_active = 1').get(input.categoryId)
    if (!cat) return { ok: false, error: 'Categoría no válida' }
  }

  const data = buildProductData(input, null, productCode)
  data.barcode = barcode
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

  const productCode = normalizeProductCode(input.productCode) ?? existing.product_code
  if (productCode && getProductByCode(db, productCode, id)) {
    return { ok: false, error: 'El código de producto ya está registrado' }
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

  const data = buildProductData(input, imagePath, productCode)
  data.barcode = barcode ?? existing.barcode
  updateProduct(db, id, data)

  return getProductService(id)
}

/** Desactiva el producto (paso previo a eliminarlo de la base de datos). */
export function deactivateProductService(id: number): ApiResult<null> {
  const db = getDatabase()
  const existing = getProductById(db, id)
  if (!existing) return { ok: false, error: 'Producto no encontrado' }
  if (existing.is_active === 0) {
    return { ok: false, error: 'El producto ya está inactivo' }
  }

  softDeleteProduct(db, id)
  return { ok: true, data: null }
}

/** Elimina el producto de la base de datos (solo si ya está inactivo). */
export function destroyProductService(id: number): ApiResult<null> {
  const db = getDatabase()
  const existing = getProductById(db, id)
  if (!existing) return { ok: false, error: 'Producto no encontrado' }
  if (existing.is_active === 1) {
    return {
      ok: false,
      error: 'Primero debe desactivar el producto antes de eliminarlo de la base de datos'
    }
  }

  const sales = countSaleItemsForProduct(db, id)
  if (sales > 0) {
    return {
      ok: false,
      error: `No se puede eliminar: el producto tiene ${sales} venta(s) registrada(s)`
    }
  }

  deleteImageIfExists(existing.image_path)
  if (!hardDeleteProduct(db, id)) {
    return { ok: false, error: 'No se pudo eliminar el producto' }
  }
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

export function getSystemServiceProductService(): ApiResult<{ productId: number }> {
  const db = getDatabase()
  const id = ensureSystemServiceProduct(db)
  return { ok: true, data: { productId: id } }
}
