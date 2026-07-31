import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import type { ReportSummary } from '@shared/types/reports'
import { formatMoney } from '@shared/lib/currency'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfMake = require('pdfmake') as {
  setLocalAccessPolicy: (cb: (path: string) => boolean) => void
  setUrlAccessPolicy: (cb: ((url: string) => boolean) | undefined) => void
  addFonts: (fonts: Record<string, Record<string, string>>) => void
  createPdf: (doc: unknown) => {
    getBuffer: () => Promise<Buffer>
    write: (filePath: string) => Promise<void>
  }
}

let fontsReady = false

function ensurePdfFonts(): void {
  if (fontsReady) return
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfmakeRoot = dirname(require.resolve('pdfmake/package.json'))
  const roboto = join(pdfmakeRoot, 'fonts', 'Roboto')
  pdfMake.setLocalAccessPolicy(() => true)
  pdfMake.setUrlAccessPolicy(() => false)
  pdfMake.addFonts({
    Roboto: {
      normal: join(roboto, 'Roboto-Regular.ttf'),
      bold: join(roboto, 'Roboto-Medium.ttf'),
      italics: join(roboto, 'Roboto-Italic.ttf'),
      bolditalics: join(roboto, 'Roboto-MediumItalic.ttf')
    }
  })
  fontsReady = true
}

function money(n: number, symbol: string): string {
  return formatMoney(n, symbol)
}

export async function writeReportPdf(
  filePath: string,
  report: ReportSummary,
  companyName: string,
  currencySymbol: string
): Promise<void> {
  ensurePdfFonts()
  const doc = buildDocDefinition(report, companyName, currencySymbol)
  const buffer = await pdfMake.createPdf(doc).getBuffer()
  writeFileSync(filePath, buffer)
}

function buildDocDefinition(
  report: ReportSummary,
  companyName: string,
  currencySymbol: string
): unknown {
  const voidSection =
    report.voidedSales.length > 0
      ? [
          { text: 'Ventas anuladas', style: 'section' },
          {
            table: {
              headerRows: 1,
              widths: [75, 90, '*', 55],
              body: [
                ['Ticket', 'Fecha', 'Motivo', 'Total'],
                ...report.voidedSales.slice(0, 100).map((s) => [
                  s.ticketNumber,
                  s.createdAt.replace('T', ' ').slice(0, 16),
                  (s.voidReason ?? '').slice(0, 50),
                  money(s.total, currencySymbol)
                ])
              ]
            },
            layout: 'lightHorizontalLines'
          }
        ]
      : []

  return {
    pageSize: 'A4',
    pageMargins: [40, 50, 40, 50],
    content: [
      { text: companyName, style: 'header' },
      { text: 'Reporte de ventas', style: 'subheader' },
      { text: `Período: ${report.dateFrom} al ${report.dateTo}`, margin: [0, 0, 0, 16] },
      {
        columns: [
          { text: `Ventas: ${report.completedCount}` },
          { text: `Total neto: ${money(report.netCompletedTotal, currencySymbol)}` },
          { text: `Devoluciones: ${money(report.returnsTotal, currencySymbol)}` },
          { text: `Ganancia: ${money(report.profit, currencySymbol)}` }
        ],
        margin: [0, 0, 0, 8]
      },
      {
        text: `Anulaciones: ${report.voidedCount} — ${money(report.voidedTotal, currencySymbol)}`,
        margin: [0, 0, 0, 20]
      },
      { text: 'Productos más vendidos', style: 'section' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 45, 65],
          body: [
            ['Producto', 'Cant.', 'Total'],
            ...(report.topProducts.length
              ? report.topProducts.map((p) => [
                  p.productName,
                  String(p.quantitySold),
                  money(p.revenue, currencySymbol)
                ])
              : [['Sin datos', '', '']])
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 20]
      },
      { text: 'Historial de ventas', style: 'section' },
      {
        table: {
          headerRows: 1,
          widths: [75, 90, 40, 55],
          body: [
            ['Ticket', 'Fecha', 'Ítems', 'Total'],
            ...(report.sales.length
              ? report.sales.slice(0, 300).map((s) => [
                  s.ticketNumber,
                  s.createdAt.replace('T', ' ').slice(0, 16),
                  String(s.itemCount),
                  money(s.total, currencySymbol)
                ])
              : [['Sin datos', '', '', '']])
          ]
        },
        layout: 'lightHorizontalLines'
      },
      ...voidSection
    ],
    styles: {
      header: { fontSize: 18, bold: true },
      subheader: { fontSize: 14, margin: [0, 4, 0, 8] },
      section: { fontSize: 12, bold: true, margin: [0, 12, 0, 6] }
    },
    defaultStyle: { fontSize: 9, font: 'Roboto' }
  }
}
