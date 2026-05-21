export interface Category {
  id: number
  parentId: number | null
  parentName: string | null
  name: string
  description: string | null
  isActive: boolean
  sortOrder: number
  productCount: number
  subcategoryCount: number
  createdAt: string
  updatedAt: string | null
}

export interface CategoryInput {
  name: string
  parentId?: number | null
  description?: string | null
  sortOrder?: number
  isActive?: boolean
}

export interface Product {
  id: number
  productCode: string | null
  name: string
  barcode: string | null
  categoryId: number | null
  categoryName: string | null
  stock: number
  stockMin: number
  brand: string | null
  size: string | null
  color: string | null
  description: string | null
  costPrice: number
  priceRetail: number
  priceWholesale: number | null
  imagePath: string | null
  isActive: boolean
  isLowStock: boolean
  createdAt: string
  updatedAt: string | null
}

export interface ProductInput {
  productCode?: string | null
  name: string
  barcode?: string | null
  categoryId?: number | null
  stock?: number
  stockMin?: number
  brand?: string | null
  size?: string | null
  color?: string | null
  description?: string | null
  costPrice?: number
  priceRetail: number
  priceWholesale?: number | null
  isActive?: boolean
  pendingImagePath?: string | null
  removeImage?: boolean
  /** Si true, no genera barcode automático al crear */
  skipAutoBarcode?: boolean
}

export interface ProductListFilters {
  search?: string
  categoryId?: number | null
  lowStockOnly?: boolean
  includeInactive?: boolean
}

export interface CategoryListFilters {
  search?: string
  includeInactive?: boolean
  parentId?: number | null
}

export interface AdjustStockInput {
  productId: number
  stock: number
}
