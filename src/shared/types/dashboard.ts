import type { CashSessionSummary } from './cash'

export interface TopProduct {
  productId: number
  productName: string
  quantitySold: number
  revenue: number
}

export interface LowStockProduct {
  id: number
  name: string
  barcode: string | null
  stock: number
  stockMin: number
  categoryName: string | null
}

export interface DashboardStats {
  date: string
  /** Ingresos netos del día (ventas − devoluciones), igual que Reportes → Hoy. */
  dailySalesTotal: number
  dailyReturnsTotal: number
  dailySalesProfit: number
  dailySalesCount: number
  /** Caja actual. */
  cashOpen: boolean
  currentSession: CashSessionSummary | null
  topProductsToday: TopProduct[]
  lowStockProducts: LowStockProduct[]
}
