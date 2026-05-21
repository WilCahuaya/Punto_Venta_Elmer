import { useCallback, useEffect, useState } from 'react'
import type { ReportDateRange, ReportSummary } from '@shared/types/reports'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { formatDateTime } from '../../lib/datetime'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ReportsPage(): React.JSX.Element {
  const [dateFrom, setDateFrom] = useState(todayIso())
  const [dateTo, setDateTo] = useState(todayIso())
  const [report, setReport] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [voidTargetId, setVoidTargetId] = useState<number | null>(null)

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

  async function handleVoid(saleId: number): Promise<void> {
    const reason = voidReason.trim() || prompt('Motivo de anulación:')?.trim()
    if (!reason) return
    const result = await window.api.sales.void({ saleId, reason })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setVoidTargetId(null)
    setVoidReason('')
    setMessage(`Venta ${result.data.ticketNumber} anulada`)
    void load()
  }

  function setQuickRange(days: number): void {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - (days - 1))
    setDateTo(to.toISOString().slice(0, 10))
    setDateFrom(from.toISOString().slice(0, 10))
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Reportes</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Ventas, ganancias, top productos y anulaciones
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
        <div className="flex gap-2 pb-2">
          <Button variant="ghost" type="button" onClick={() => setQuickRange(1)}>
            Hoy
          </Button>
          <Button variant="ghost" type="button" onClick={() => setQuickRange(7)}>
            7 días
          </Button>
          <Button variant="ghost" type="button" onClick={() => setQuickRange(30)}>
            30 días
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
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Ventas completadas" value={report.completedCount} suffix="tickets" />
            <KpiCard title="Total vendido">
              <MoneyDisplay amount={report.completedTotal} size="lg" />
            </KpiCard>
            <KpiCard title="Ganancia">
              <MoneyDisplay amount={report.profit} size="lg" className="text-emerald-600" />
            </KpiCard>
            <KpiCard title="Anulaciones" value={report.voidedCount} suffix="tickets" highlight />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ReportTable
              title="Productos más vendidos"
              empty="Sin ventas en el período"
              headers={['Producto', 'Cant.', 'Total']}
              rows={report.topProducts.map((p) => [
                p.productName,
                String(p.quantitySold),
                <MoneyDisplay key="t" amount={p.revenue} size="sm" />
              ])}
            />

            <ReportTable
              title={`Anulaciones (${report.voidedCount}) — ${report.voidedTotal > 0 ? '' : ''}`}
              empty="Sin anulaciones"
              headers={['Ticket', 'Fecha', 'Motivo', 'Total']}
              rows={report.voidedSales.map((s) => [
                s.ticketNumber,
                formatDateTime(s.createdAt),
                s.voidReason ?? '—',
                <MoneyDisplay key="t" amount={s.total} size="sm" />
              ])}
              footer={
                report.voidedTotal > 0 ? (
                  <p className="px-4 py-2 text-sm">
                    Total anulado: <MoneyDisplay amount={report.voidedTotal} size="sm" className="inline" />
                  </p>
                ) : null
              }
            />
          </div>

          <section className="mt-6 overflow-hidden rounded-xl border border-surface-border">
            <div className="border-b border-surface-border bg-surface-elevated px-4 py-3">
              <h3 className="font-medium">Historial de ventas ({report.sales.length})</h3>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-elevated">
                  <tr className="border-b border-surface-border text-left">
                    <th className="px-4 py-2 font-medium">Ticket</th>
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Ítems</th>
                    <th className="px-4 py-2 font-medium text-right">Total</th>
                    <th className="px-4 py-2 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[rgb(var(--text-muted))]">
                        Sin ventas en el período
                      </td>
                    </tr>
                  ) : (
                    report.sales.map((s) => (
                      <tr key={s.id} className="border-b border-surface-border/50">
                        <td className="px-4 py-2 font-mono">{s.ticketNumber}</td>
                        <td className="px-4 py-2 text-[rgb(var(--text-muted))]">
                          {formatDateTime(s.createdAt)}
                        </td>
                        <td className="px-4 py-2">{s.itemCount}</td>
                        <td className="px-4 py-2 text-right">
                          <MoneyDisplay amount={s.total} size="sm" />
                        </td>
                        <td className="px-4 py-2 text-right">
                          {voidTargetId === s.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <input
                                className="w-32 rounded border border-surface-border px-2 py-1 text-xs"
                                placeholder="Motivo"
                                value={voidReason}
                                onChange={(e) => setVoidReason(e.target.value)}
                                autoFocus
                              />
                              <Button
                                variant="secondary"
                                type="button"
                                onClick={() => void handleVoid(s.id)}
                              >
                                OK
                              </Button>
                              <button
                                type="button"
                                className="text-xs text-[rgb(var(--text-muted))]"
                                onClick={() => setVoidTargetId(null)}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              type="button"
                              onClick={() => {
                                setVoidTargetId(s.id)
                                setVoidReason('')
                              }}
                            >
                              Anular
                            </Button>
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
