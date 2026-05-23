import type { Product } from './catalog'

export type PriceMode = 'retail' | 'wholesale' | 'custom'

export interface PosProduct {
  id: number
  name: string
  barcode: string | null
  categoryName: string | null
  stock: number
  size: string | null
  color: string | null
  costPrice: number
  priceRetail: number
  priceWholesale: number | null
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
  priceLabel: string
  /** Venta de servicio libre (sin stock). */
  isService?: boolean
}

export interface SaleItemInput {
  productId: number
  quantity: number
  unitPrice: number
  /** Nombre mostrado en ticket (servicio libre). */
  displayName?: string
  /** No valida ni descuenta stock. */
  isFreeService?: boolean
}

export interface CreateSaleInput {
  items: SaleItemInput[]
  priceMode?: PriceMode
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

export type SaleStatus = 'completed' | 'voided'

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
  status: SaleStatus
  items: SaleItem[]
  createdAt: string
  voidedAt?: string | null
  voidReason?: string | null
  voidedByName?: string | null
  returnedTotal?: number
  netTotal?: number
}

export interface SaleItemDetail extends SaleItem {
  returnedQuantity: number
  returnableQuantity: number
}

export interface SaleDetail extends Sale {
  items: SaleItemDetail[]
}

export interface PartialReturnLineInput {
  saleItemId: number
  quantity: number
}

export interface PartialReturnInput {
  saleId: number
  reason: string
  items: PartialReturnLineInput[]
}

/** Venta en listado por sesión de caja o reportes. */
export interface SaleListEntry {
  id: number
  ticketNumber: string
  sessionId: number
  createdAt: string
  subtotal: number
  discount: number
  total: number
  netTotal: number
  returnedTotal: number
  amountPaid: number
  changeAmount: number
  status: SaleStatus
  voidReason: string | null
  voidedAt: string | null
  voidedByName: string | null
  itemCount: number
}

export function productToPosProduct(product: Product): PosProduct {
  return {
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    categoryName: product.categoryName,
    stock: product.stock,
    size: product.size,
    color: product.color,
    costPrice: product.costPrice,
    priceRetail: product.priceRetail,
    priceWholesale: product.priceWholesale,
    imagePath: product.imagePath
  }
}
