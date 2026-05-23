import { useCallback, useEffect, useState } from 'react'
import type { ReportDateRange, ReportSaleRow, ReportSummary } from '@shared/types/reports'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { ReturnSaleModal } from '../../features/reports/ReturnSaleModal'
import { VoidSaleModal } from '../../features/reports/VoidSaleModal'
import {
  formatDateTime,
  localDateIso,
  startOfMonth,
  startOfWeekMonday
} from '../../lib/datetime'

function saleStatusLabel(status: ReportSaleRow['status']): string {
  return status === 'voided' ? 'ANULADA' : 'COMPLETADA'
}

export function ReportsPage(): React.JSX.Element {
  const [dateFrom, setDateFrom] = useState(() => localDateIso())
  const [dateTo, setDateTo] = useState(() => localDateIso())
  const [report, setReport] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [voidTarget, setVoidTarget] = useState<ReportSaleRow | null>(null)
  const [returnTarget, setReturnTarget] = useState<ReportSaleRow | null>(null)

  const range: ReportDateRange = { dateFrom, dateTo }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await window.api.reports.getSummary(range)
    setLoading(false)
    if (result.ok) setReport(result.data)
    else setError(result.error)
  }, [dateFrom, dateTo])

  useEffect(() => {
    void load()
  }, [load])

  async function handleExportPdf(): Promise<void> {
    setExporting('pdf')
    setError(null)
    const result = await window.api.reports.exportPdf(range)
    setExporting(null)
    if (!result.ok) setError(result.error)
    else setMessage(`PDF guardado: ${result.data}`)
  }

  async function handleExportExcel(): Promise<void> {
    setExporting('excel')
    setError(null)
    const result = await window.api.reports.exportExcel(range)
    setExporting(null)
    if (!result.ok) setError(result.error)
    else setMessage(`Excel guardado: ${result.data}`)
  }

  async function handleVoidConfirm(reason: string): Promise<void> {
    if (!voidTarget) return
    const result = await window.api.sales.void({ saleId: voidTarget.id, reason })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setVoidTarget(null)
    setMessage(`Venta ${result.data.ticketNumber} anulada`)
    void load()
  }

  function setRangeToday(): void {
    const today = localDateIso()
    setDateFrom(today)
    setDateTo(today)
  }

  function setRangeThisWeek(): void {
    const today = new Date()
    setDateFrom(localDateIso(startOfWeekMonday(today)))
    setDateTo(localDateIso(today))
  }

  function setRangeThisMonth(): void {
    const today = new Date()
    setDateFrom(localDateIso(startOfMonth(today)))
    setDateTo(localDateIso(today))
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Reportes</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Análisis por fechas, exportación y correcciones
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={!!exporting}
            onClick={() => void handleExportPdf()}
          >
            {exporting === 'pdf' ? 'Exportando...' : 'Exportar PDF'}
          </Button>
          <Button
            variant="secondary"
            disabled={!!exporting}
            onClick={() => void handleExportExcel()}
          >
            {exporting === 'excel' ? 'Exportando...' : 'Exportar Excel'}
          </Button>
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            Actualizar
          </Button>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-surface-border bg-surface-elevated p-4">
        <Input
          label="Desde"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <Input
          label="Hasta"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 pb-2">
          <Button variant="ghost" type="button" onClick={setRangeToday}>
            Hoy
          </Button>
          <Button variant="ghost" type="button" onClick={setRangeThisWeek}>
            Esta semana
          </Button>
          <Button variant="ghost" type="button" onClick={setRangeThisMonth}>
            Este mes
          </Button>
        </div>
      </div>

      {message && (
        <p className="mb-4 rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand">{message}</p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading && !report ? (
        <p className="text-[rgb(var(--text-muted))]">Cargando...</p>
      ) : report ? (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard title="Ventas completadas" value={report.completedCount} suffix="tickets" />
            <KpiCard title="Total neto (ingresos)">
              <MoneyDisplay amount={report.netCompletedTotal} size="lg" />
            </KpiCard>
            <KpiCard title="Devoluciones">
              <MoneyDisplay amount={report.returnsTotal} size="lg" className="text-amber-600" />
            </KpiCard>
            <KpiCard title="Ganancia">
              <MoneyDisplay amount={report.profit} size="lg" className="text-emerald-600" />
            </KpiCard>
            <KpiCard title="Anulaciones" value={report.voidedCount} suffix="tickets" highlight />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ReportTable
              title="Productos más vendidos (neto)"
              empty="Sin ventas en el período"
              headers={['Producto', 'Cant.', 'Total']}
              rows={report.topProducts.map((p) => [
                p.productName,
                String(p.quantitySold),
                <MoneyDisplay key="t" amount={p.revenue} size="sm" />
              ])}
            />

            <ReportTable
              title={`Anulaciones (${report.voidedCount})`}
              empty="Sin anulaciones"
              headers={['Ticket', 'Anulada', 'Motivo', 'Total']}
              rows={report.voidedSales.map((s) => [
                s.ticketNumber,
                s.voidedAt ? formatDateTime(s.voidedAt) : '—',
                s.voidReason ?? '—',
                <MoneyDisplay key="t" amount={s.total} size="sm" />
              ])}
              footer={
                report.voidedTotal > 0 ? (
                  <p className="px-4 py-2 text-sm text-[rgb(var(--text-muted))]">
                    Total anulado (no cuenta en ingresos):{' '}
                    <MoneyDisplay amount={report.voidedTotal} size="sm" className="inline" />
                  </p>
                ) : null
              }
            />
          </div>

          <section className="mt-6 overflow-hidden rounded-xl border border-surface-border">
            <div className="border-b border-surface-border bg-surface-elevated px-4 py-3">
              <h3 className="font-medium">Historial de ventas ({report.allSales.length})</h3>
              <p className="text-xs text-[rgb(var(--text-muted))]">
                Completadas y anuladas · Las anuladas no suman en ingresos
              </p>
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-elevated">
                  <tr className="border-b border-surface-border text-left">
                    <th className="px-4 py-2 font-medium">Estado</th>
                    <th className="px-4 py-2 font-medium">Ticket</th>
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium text-right">Total / Neto</th>
                    <th className="px-4 py-2 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {report.allSales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[rgb(var(--text-muted))]">
                        Sin ventas en el período
                      </td>
                    </tr>
                  ) : (
                    report.allSales.map((s) => (
                      <tr
                        key={s.id}
                        className={[
                          'border-b border-surface-border/50',
                          s.status === 'voided'
                            ? 'bg-red-500/5 line-through decoration-red-300/60'
                            : 'hover:bg-surface-elevated/40'
                        ].join(' ')}
                      >
                        <td className="px-4 py-2">
                          <Badge variant={s.status === 'voided' ? 'warning' : 'success'}>
                            {saleStatusLabel(s.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 font-mono">{s.ticketNumber}</td>
                        <td className="px-4 py-2">
                          <div>{formatDateTime(s.createdAt)}</div>
                          {s.status === 'voided' && s.voidedAt && (
                            <div className="text-xs text-red-600/90 no-underline">
                              Anulada: {formatDateTime(s.voidedAt)}
                              {s.voidedByName ? ` · ${s.voidedByName}` : ''}
                            </div>
                          )}
                          {s.status === 'completed' && s.returnedTotal > 0 && (
                            <div className="text-xs text-amber-600 no-underline">
                              Devuelto: <MoneyDisplay amount={s.returnedTotal} size="sm" className="inline" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right no-underline">
                          {s.status === 'voided' ? (
                            <MoneyDisplay amount={s.total} size="sm" />
                          ) : (
                            <>
                              <MoneyDisplay amount={s.netTotal} size="sm" />
                              {s.returnedTotal > 0 && (
                                <div className="text-xs text-[rgb(var(--text-muted))]">
                                  Bruto{' '}
                                  <MoneyDisplay amount={s.total} size="sm" className="inline" />
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right no-underline">
                          {s.status === 'completed' && (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                type="button"
                                onClick={() => setReturnTarget(s)}
                              >
                                Devolver
                              </Button>
                              <Button
                                variant="danger"
                                type="button"
                                onClick={() => setVoidTarget(s)}
                              >
                                Anular
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      <VoidSaleModal
        open={!!voidTarget}
        sale={voidTarget}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleVoidConfirm}
      />

      <ReturnSaleModal
        open={!!returnTarget}
        sale={returnTarget}
        onClose={() => setReturnTarget(null)}
        onSaved={() => {
          setMessage('Devolución registrada')
          void load()
        }}
      />
    </div>
  )
}

function KpiCard({
  title,
  children,
  value,
  suffix,
  highlight
}: {
  title: string
  children?: React.ReactNode
  value?: number
  suffix?: string
  highlight?: boolean
}): React.JSX.Element {
  return (
    <div
      className={[
        'rounded-xl border border-surface-border bg-surface-elevated p-4',
        highlight ? 'border-amber-500/40' : ''
      ].join(' ')}
    >
      <p className="text-sm text-[rgb(var(--text-muted))]">{title}</p>
      <div className="mt-2">
        {value != null ? (
          <span className="text-2xl font-semibold tabular-nums">
            {value}
            {suffix && (
              <span className="ml-1 text-sm font-normal text-[rgb(var(--text-muted))]">
                {suffix}
              </span>
            )}
          </span>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function ReportTable({
  title,
  headers,
  rows,
  empty,
  footer
}: {
  title: string
  headers: string[]
  rows: (string | React.ReactNode)[][]
  empty: string
  footer?: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border border-surface-border">
      <div className="border-b border-surface-border bg-surface-elevated px-4 py-3">
        <h3 className="font-medium">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[rgb(var(--text-muted))]">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface/50 text-left">
              {headers.map((h) => (
                <th key={h} className="px-4 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-surface-border/50">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {footer}
    </section>
  )
}
