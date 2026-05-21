import ExcelJS from 'exceljs'
import type { ReportSummary } from '@shared/types/reports'
import { formatMoney } from '@shared/lib/currency'

function money(n: number, symbol: string): string {
  return formatMoney(n, symbol)
}

export async function writeReportExcel(
  filePath: string,
  report: ReportSummary,
  companyName: string,
  currencySymbol: string
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Punto de Venta'

  const summary = wb.addWorksheet('Resumen')
  summary.columns = [
    { header: 'Concepto', key: 'label', width: 28 },
    { header: 'Valor', key: 'value', width: 24 }
  ]
  summary.addRows([
    { label: 'Empresa', value: companyName },
    { label: 'Desde', value: report.dateFrom },
    { label: 'Hasta', value: report.dateTo },
    { label: 'Ventas completadas', value: report.completedCount },
    { label: 'Total ventas', value: money(report.completedTotal, currencySymbol) },
    { label: 'Ganancia', value: money(report.profit, currencySymbol) },
    { label: 'Anulaciones', value: report.voidedCount },
    { label: 'Total anulado', value: money(report.voidedTotal, currencySymbol) }
  ])
  summary.getRow(1).font = { bold: true }

  const top = wb.addWorksheet('Top productos')
  top.columns = [
    { header: 'Producto', key: 'name', width: 36 },
    { header: 'Cantidad', key: 'qty', width: 12 },
    { header: 'Total', key: 'total', width: 16 }
  ]
  top.getRow(1).font = { bold: true }
  for (const p of report.topProducts) {
    top.addRow({
      name: p.productName,
      qty: p.quantitySold,
      total: money(p.revenue, currencySymbol)
    })
  }

  const sales = wb.addWorksheet('Ventas')
  sales.columns = [
    { header: 'Ticket', key: 'ticket', width: 16 },
    { header: 'Fecha', key: 'date', width: 20 },
    { header: 'Ítems', key: 'items', width: 8 },
    { header: 'Subtotal', key: 'subtotal', width: 14 },
    { header: 'Descuento', key: 'discount', width: 12 },
    { header: 'Total', key: 'total', width: 14 },
    { header: 'Estado', key: 'status', width: 12 }
  ]
  sales.getRow(1).font = { bold: true }
  for (const s of report.sales) {
    sales.addRow({
      ticket: s.ticketNumber,
      date: s.createdAt,
      items: s.itemCount,
      subtotal: money(s.subtotal, currencySymbol),
      discount: money(s.discount, currencySymbol),
      total: money(s.total, currencySymbol),
      status: 'Completada'
    })
  }

  const voided = wb.addWorksheet('Anulaciones')
  voided.columns = [
    { header: 'Ticket', key: 'ticket', width: 16 },
    { header: 'Fecha venta', key: 'date', width: 20 },
    { header: 'Anulada', key: 'voided', width: 20 },
    { header: 'Motivo', key: 'reason', width: 32 },
    { header: 'Total', key: 'total', width: 14 }
  ]
  voided.getRow(1).font = { bold: true }
  for (const s of report.voidedSales) {
    voided.addRow({
      ticket: s.ticketNumber,
      date: s.createdAt,
      voided: s.voidedAt ?? '',
      reason: s.voidReason ?? '',
      total: money(s.total, currencySymbol)
    })
  }

  await wb.xlsx.writeFile(filePath)
}
