import type { Product } from './catalog'

export type PriceMode = 'retail' | 'wholesale'

export interface PosProduct {
  id: number
  name: string
  barcode: string | null
  categoryName: string | null
  stock: number
  size: string | null
  color: string | null
  unitPrice: number
  costPrice: number
  priceRetail: number
  priceWholesale: number
  imagePath: string | null
}

export interface CartLine {
  key: string
  productId: number
  name: string
  barcode: string | null
  quantity: number
  unitPrice: number
  costPrice: number
  maxStock: number
  lineTotal: number
}

export interface SaleItemInput {
  productId: number
  quantity: number
  unitPrice: number
}

export interface CreateSaleInput {
  items: SaleItemInput[]
  priceMode: PriceMode
  amountPaid: number
  discount?: number
}

export interface SaleItem {
  id: number
  productId: number
  productName: string
  barcode: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Sale {
  id: number
  ticketNumber: string
  sessionId: number
  subtotal: number
  discount: number
  total: number
  amountPaid: number
  changeAmount: number
  priceMode: PriceMode
  items: SaleItem[]
  createdAt: string
}

export function productToPosProduct(product: Product, priceMode: PriceMode): PosProduct {
  return {
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    categoryName: product.categoryName,
    stock: product.stock,
    size: product.size,
    color: product.color,
    unitPrice: priceMode === 'wholesale' ? product.priceWholesale : product.priceRetail,
    costPrice: product.costPrice,
    priceRetail: product.priceRetail,
    priceWholesale: product.priceWholesale,
    imagePath: product.imagePath
  }
}
