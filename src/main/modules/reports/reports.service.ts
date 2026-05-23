import { dialog, shell } from 'electron'
import type { ApiResult } from '@shared/types/api'
import type { ReportDateRange, ReportSaleRow, ReportSummary } from '@shared/types/reports'
import { roundMoney } from '@shared/lib/currency'
import { localDateIso } from '@shared/lib/local-date'
import { getDatabase } from '../../database/connection'
import { fromMoneyDb } from '../../utils/money-db'
import { writeReportExcel } from '../../services/export-excel.service'
import { writeReportPdf } from '../../services/export-pdf.service'
import {
  getReportSummary,
  getTopProductsInRange,
  listAllSalesInRange,
  listSalesInRange,
  type SaleListRow,
  type TopProductRow
} from './reports.repository'

function getSetting(key: string, fallback = ''): string {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? fallback
}

function mapSaleRow(row: SaleListRow): ReportSaleRow {
  const total = fromMoneyDb(row.total)
  const returnedTotal = fromMoneyDb(row.returned_total)
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    createdAt: row.created_at,
    subtotal: fromMoneyDb(row.subtotal),
    discount: fromMoneyDb(row.discount),
    total,
    returnedTotal,
    netTotal: roundMoney(row.status === 'voided' ? 0 : Math.max(0, total - returnedTotal)),
    status: row.status as ReportSaleRow['status'],
    voidReason: row.void_reason,
    voidedAt: row.voided_at,
    voidedByName: row.voided_by_name,
    itemCount: row.item_count
  }
}

function mapTop(row: TopProductRow) {
  return {
    productId: row.product_id,
    productName: row.product_name,
    quantitySold: Number(row.qty),
    revenue: fromMoneyDb(row.revenue)
  }
}

function normalizeRange(range: ReportDateRange): ReportDateRange {
  const from = range.dateFrom?.trim() || localDateIso()
  const to = range.dateTo?.trim() || from
  if (from > to) return { dateFrom: to, dateTo: from }
  return { dateFrom: from, dateTo: to }
}

export function getReportSummaryService(range: ReportDateRange): ApiResult<ReportSummary> {
  const db = getDatabase()
  const r = normalizeRange(range)
  const summary = getReportSummary(db, r)
  const completedTotal = fromMoneyDb(summary.completed_total)
  const returnsTotal = fromMoneyDb(summary.returns_total)

  return {
    ok: true,
    data: {
      dateFrom: r.dateFrom,
      dateTo: r.dateTo,
      completedCount: summary.completed_count,
      completedTotal,
      returnsTotal,
      netCompletedTotal: roundMoney(Math.max(0, completedTotal - returnsTotal)),
      profit: roundMoney(Number(summary.profit)),
      voidedCount: summary.voided_count,
      voidedTotal: fromMoneyDb(summary.voided_total),
      topProducts: getTopProductsInRange(db, r).map(mapTop),
      allSales: listAllSalesInRange(db, r).map(mapSaleRow),
      sales: listSalesInRange(db, r, 'completed').map(mapSaleRow),
      voidedSales: listSalesInRange(db, r, 'voided').map(mapSaleRow)
    }
  }
}

async function pickSavePath(defaultName: string, ext: 'pdf' | 'xlsx'): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [
      ext === 'pdf'
        ? { name: 'PDF', extensions: ['pdf'] }
        : { name: 'Excel', extensions: ['xlsx'] }
    ]
  })
  if (result.canceled || !result.filePath) return null
  return result.filePath
}

export async function exportReportPdfService(
  range: ReportDateRange
): Promise<ApiResult<string>> {
  const reportResult = getReportSummaryService(range)
  if (!reportResult.ok) return reportResult

  const filePath = await pickSavePath(
    `reporte-${reportResult.data.dateFrom}-${reportResult.data.dateTo}.pdf`,
    'pdf'
  )
  if (!filePath) return { ok: false, error: 'Exportación cancelada' }

  try {
    await writeReportPdf(
      filePath,
      reportResult.data,
      getSetting('company_name', 'Punto de Venta'),
      getSetting('currency_symbol', 'S/')
    )
    await shell.openPath(filePath)
    return { ok: true, data: filePath }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al exportar PDF' }
  }
}

export async function exportReportExcelService(
  range: ReportDateRange
): Promise<ApiResult<string>> {
  const reportResult = getReportSummaryService(range)
  if (!reportResult.ok) return reportResult

  const filePath = await pickSavePath(
    `reporte-${reportResult.data.dateFrom}-${reportResult.data.dateTo}.xlsx`,
    'xlsx'
  )
  if (!filePath) return { ok: false, error: 'Exportación cancelada' }

  try {
    await writeReportExcel(
      filePath,
      reportResult.data,
      getSetting('company_name', 'Punto de Venta'),
      getSetting('currency_symbol', 'S/')
    )
    await shell.openPath(filePath)
    return { ok: true, data: filePath }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al exportar Excel' }
  }
}
