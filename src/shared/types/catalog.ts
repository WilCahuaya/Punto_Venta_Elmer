export interface Category {
  id: number
  name: string
  description: string | null
  isActive: boolean
  sortOrder: number
  productCount: number
  createdAt: string
  updatedAt: string | null
}

export interface CategoryInput {
  name: string
  description?: string | null
  sortOrder?: number
  isActive?: boolean
}

export interface Product {
  id: number
  name: string
  barcode: string | null
  categoryId: number | null
  categoryName: string | null
  stock: number
  stockMin: number
  size: string | null
  color: string | null
  costPrice: number
  priceRetail: number
  priceWholesale: number
  imagePath: string | null
  isActive: boolean
  isLowStock: boolean
  createdAt: string
  updatedAt: string | null
}

export interface ProductInput {
  name: string
  barcode?: string | null
  categoryId?: number | null
  stock?: number
  stockMin?: number
  size?: string | null
  color?: string | null
  costPrice?: number
  priceRetail: number
  priceWholesale: number
  isActive?: boolean
  /** Ruta absoluta temporal del archivo elegido; main la copia a userData. */
  pendingImagePath?: string | null
  removeImage?: boolean
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
}
