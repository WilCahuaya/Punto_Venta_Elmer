import { fromMoneyDb } from '../../utils/money-db'
import type { Product } from '@shared/types/catalog'
import type { ProductRow } from './products.repository'

function mapWholesale(value: string): number | null {
  const n = fromMoneyDb(value)
  return n > 0 ? n : null
}

export function mapProductRow(row: ProductRow): Product {
  const stock = Number(row.stock)
  const stockMin = Number(row.stock_min)
  return {
    id: row.id,
    productCode: row.product_code,
    name: row.name,
    barcode: row.barcode,
    categoryId: row.category_id,
    categoryName: row.category_name,
    stock,
    stockMin,
    brand: row.brand,
    size: row.size,
    color: row.color,
    description: row.description,
    costPrice: fromMoneyDb(row.cost_price),
    priceRetail: fromMoneyDb(row.price_retail),
    priceWholesale: mapWholesale(row.price_wholesale),
    imagePath: row.image_path,
    isActive: row.is_active === 1,
    isLowStock: stock <= stockMin,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
