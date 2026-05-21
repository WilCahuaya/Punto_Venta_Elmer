import type { ApiResult } from '@shared/types/api'
import type { DashboardStats, LowStockProduct, TopProduct } from '@shared/types/dashboard'
import { roundMoney } from '@shared/lib/currency'
import { getDatabase } from '../../database/connection'
import { getCurrentCashService } from '../cash/cash.service'
import { fromMoneyDb } from '../../utils/money-db'
import {
  getDailyProfit,
  getDailySales,
  getLowStockProducts,
  getTodayDate,
  getTopProductsToday,
  type LowStockRow,
  type TopProductRow
} from './dashboard.repository'

function mapTopProduct(row: TopProductRow): TopProduct {
  return {
    productId: row.product_id,
    productName: row.product_name,
    quantitySold: Number(row.qty),
    revenue: fromMoneyDb(row.revenue)
  }
}

function mapLowStock(row: LowStockRow): LowStockProduct {
  return {
    id: row.id,
    name: row.name,
    barcode: row.barcode,
    stock: Number(row.stock),
    stockMin: Number(row.stock_min),
    categoryName: row.category_name
  }
}

export function getDashboardStatsService(): ApiResult<DashboardStats> {
  const db = getDatabase()
  const daily = getDailySales(db)
  const cashResult = getCurrentCashService()

  let currentSession = null
  let cashOpen = false
  if (cashResult.ok) {
    currentSession = cashResult.data
    cashOpen = cashResult.data?.status === 'open'
  }

  return {
    ok: true,
    data: {
      date: getTodayDate(db),
      dailySalesTotal: fromMoneyDb(daily.total),
      dailySalesProfit: roundMoney(getDailyProfit(db)),
      dailySalesCount: daily.count,
      cashOpen,
      currentSession,
      topProductsToday: getTopProductsToday(db, 5).map(mapTopProduct),
      lowStockProducts: getLowStockProducts(db, 8).map(mapLowStock)
    }
  }
}
