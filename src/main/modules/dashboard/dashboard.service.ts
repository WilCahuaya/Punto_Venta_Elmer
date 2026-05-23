import type { ApiResult } from '@shared/types/api'
import type { DashboardStats, LowStockProduct, TopProduct } from '@shared/types/dashboard'
import { localDateIso } from '@shared/lib/local-date'
import { getDatabase } from '../../database/connection'
import { getCurrentCashService } from '../cash/cash.service'
import { getReportSummaryService } from '../reports/reports.service'
import { getLowStockProducts, type LowStockRow } from './dashboard.repository'

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

function mapTopFromReport(p: {
  productId: number
  productName: string
  quantitySold: number
  revenue: number
}): TopProduct {
  return {
    productId: p.productId,
    productName: p.productName,
    quantitySold: p.quantitySold,
    revenue: p.revenue
  }
}

/** KPIs del día alineados con Reportes (misma consulta y totales netos). */
export function getDashboardStatsService(): ApiResult<DashboardStats> {
  const db = getDatabase()
  const today = localDateIso()
  const reportResult = getReportSummaryService({ dateFrom: today, dateTo: today })
  if (!reportResult.ok) return reportResult

  const r = reportResult.data
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
      date: today,
      dailySalesTotal: r.netCompletedTotal,
      dailyReturnsTotal: r.returnsTotal,
      dailySalesProfit: r.profit,
      dailySalesCount: r.completedCount,
      cashOpen,
      currentSession,
      topProductsToday: r.topProducts.slice(0, 5).map(mapTopFromReport),
      lowStockProducts: getLowStockProducts(db, 8).map(mapLowStock)
    }
  }
}
