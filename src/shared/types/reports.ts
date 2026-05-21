export interface ReportDateRange {
  dateFrom: string
  dateTo: string
}

export interface ReportSaleRow {
  id: number
  ticketNumber: string
  createdAt: string
  subtotal: number
  discount: number
  total: number
  status: 'completed' | 'voided'
  voidReason: string | null
  voidedAt: string | null
  itemCount: number
}

export interface ReportTopProduct {
  productId: number
  productName: string
  quantitySold: number
  revenue: number
}

export interface ReportSummary {
  dateFrom: string
  dateTo: string
  completedCount: number
  completedTotal: number
  profit: number
  voidedCount: number
  voidedTotal: number
  topProducts: ReportTopProduct[]
  sales: ReportSaleRow[]
  voidedSales: ReportSaleRow[]
}

export interface VoidSaleInput {
  saleId: number
  reason: string
}
