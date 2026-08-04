import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { DashboardStats } from '@shared/types/dashboard'
import type { ReportDateRange, ReportSaleRow, ReportSummary } from '@shared/types/reports'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { ReturnSaleModal } from '../../features/reports/ReturnSaleModal'
import { VoidSaleModal } from '../../features/reports/VoidSaleModal'
import { SaleDetailModal } from '../../features/sales/SaleDetailModal'
import {
  formatDateTime,
  localDateIso,
  startOfMonth,
  startOfWeekMonday
} from '../../lib/datetime'
import { useCashStore } from '../../stores/cash.store'

function saleStatusLabel(status: ReportSaleRow['status']): string {
  return status === 'voided' ? 'ANULADA' : 'COMPLETADA'
}

export function DashboardPage(): React.JSX.Element {
  const refreshCash = useCashStore((s) => s.refresh)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [dateFrom, setDateFrom] = useState(() => localDateIso())
  const [dateTo, setDateTo] = useState(() => localDateIso())
  const [ticketQuery, setTicketQuery] = useState('')
  const [report, setReport] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<number | null>(null)
  const [detailSaleId, setDetailSaleId] = useState<number | null>(null)
  const [voidTarget, setVoidTarget] = useState<ReportSaleRow | null>(null)
  const [returnTarget, setReturnTarget] = useState<ReportSaleRow | null>(null)

  const range: ReportDateRange = { dateFrom, dateTo }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    await refreshCash()
    const [dashRes, reportRes] = await Promise.all([
      window.api.dashboard.getStats(),
      window.api.reports.getSummary(range)
    ])
    if (dashRes.ok) setStats(dashRes.data)
    if (reportRes.ok) setReport(reportRes.data)
    else setError(reportRes.error)
    setLoading(false)
  }, [refreshCash, dateFrom, dateTo])

  useEffect(() => {
    void load()
  }, [load])

  const filteredSales = useMemo(() => {
    const rows = report?.allSales ?? []
    const q = ticketQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((s) => s.ticketNumber.toLowerCase().includes(q))
  }, [report?.allSales, ticketQuery])

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

  async function handleReprint(sale: ReportSaleRow): Promise<void> {
    setPrintingId(sale.id)
    setMessage(null)
    setError(null)
    const res = await window.api.sales.printTicket(sale.id)
    setPrintingId(null)
    if (res.ok) setMessage(`Ticket ${sale.ticketNumber} enviado a impresora`)
    else setError(res.error)
  }

  async function handleExportPdf(): Promise<void> {
    setExporting('pdf')
    setError(null)
    setMessage(null)
    try {
      const result = await window.api.reports.exportPdf(range)
      if (!result.ok) setError(result.error)
      else setMessage(`PDF guardado: ${result.data}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al exportar PDF')
    } finally {
      setExporting(null)
    }
  }

  async function handleExportExcel(): Promise<void> {
    setExporting('excel')
    setError(null)
    setMessage(null)
    try {
      const result = await window.api.reports.exportExcel(range)
      if (!result.ok) setError(result.error)
      else setMessage(`Excel guardado: ${result.data}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al exportar Excel')
    } finally {
      setExporting(null)
    }
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

  if (loading && !stats && !report) {
    return (
      <div className="flex h-64 items-center justify-center text-[rgb(var(--text-muted))]">
        Cargando...
      </div>
    )
  }

  const session = stats?.currentSession

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Inicio</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Resumen, buscar tickets y reimprimir
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          Actualizar
        </Button>
      </header>

      {message && (
        <p className="rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand">{message}</p>
      )}
      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      {/* Caja */}
      {stats && (
        <section className="rounded-xl border border-brand/20 bg-brand/5 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">Caja</h3>
            <Badge variant={stats.cashOpen ? 'success' : 'warning'}>
              {stats.cashOpen ? 'Abierta' : 'Cerrada'}
            </Badge>
          </div>

          {stats.cashOpen && session ? (
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-sm text-[rgb(var(--text-muted))]">Efectivo esperado ahora</p>
                <MoneyDisplay
                  amount={session.expectedInDrawer}
                  size="lg"
                  className="mt-1 font-semibold"
                />
                <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">
                  Turno #{session.id} · Abierto {formatDateTime(session.openedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/cash">
                  <Button>Ir a Caja</Button>
                </Link>
                <Link to="/cash?tab=tickets">
                  <Button variant="secondary" type="button">
                    Tickets del turno
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-[rgb(var(--text-muted))]">
                Abra la caja para vender desde el POS.
              </p>
              <Link to="/cash">
                <Button>Abrir caja</Button>
              </Link>
            </div>
          )}
        </section>
      )}

      {/* KPIs del período */}
      {report && (
        <section>
          <h3 className="mb-3 text-sm font-medium text-[rgb(var(--text-muted))]">
            Resumen del período
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard title="Ventas" value={report.completedCount} suffix="tickets" />
            <KpiCard title="Ingresos netos">
              <MoneyDisplay amount={report.netCompletedTotal} size="lg" />
            </KpiCard>
            <KpiCard title="Devoluciones">
              <MoneyDisplay
                amount={report.returnsTotal}
                size="lg"
                className={report.returnsTotal > 0 ? 'text-amber-600' : ''}
              />
            </KpiCard>
            <KpiCard title="Ganancia">
              <MoneyDisplay amount={report.profit} size="lg" className="text-emerald-600" />
            </KpiCard>
            <KpiCard title="Anulaciones" value={report.voidedCount} suffix="tickets" highlight />
          </div>
        </section>
      )}

      {/* Buscar y reimprimir — bloque principal */}
      <section className="overflow-hidden rounded-xl border-2 border-brand/30 bg-surface-elevated shadow-sm">
        <div className="border-b border-brand/15 bg-brand/5 px-4 py-3 sm:px-5">
          <h3 className="text-lg font-semibold">Buscar ticket</h3>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Filtre por fecha y código para reimprimir
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 px-4 py-4 sm:px-5">
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
          <div className="min-w-[220px] flex-1">
            <Input
              label="Código de ticket"
              placeholder="Ej. 0009 o 20240804-0009"
              value={ticketQuery}
              onChange={(e) => setTicketQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 pb-0.5">
            <Button variant="ghost" type="button" onClick={setRangeToday}>
              Hoy
            </Button>
            <Button variant="ghost" type="button" onClick={setRangeThisWeek}>
              Semana
            </Button>
            <Button variant="ghost" type="button" onClick={setRangeThisMonth}>
              Mes
            </Button>
            {ticketQuery && (
              <Button variant="ghost" type="button" onClick={() => setTicketQuery('')}>
                Limpiar
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto border-t border-surface-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-surface-elevated">
              <tr className="border-b border-surface-border text-left">
                <th className="px-4 py-2.5 font-medium">Ticket</th>
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
                <th className="px-4 py-2.5 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && !report ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[rgb(var(--text-muted))]">
                    Cargando tickets...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[rgb(var(--text-muted))]">
                    {ticketQuery
                      ? `Ningún ticket coincide con «${ticketQuery}»`
                      : 'Sin ventas en estas fechas'}
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr
                    key={s.id}
                    className={[
                      'border-b border-surface-border/50',
                      s.status === 'voided'
                        ? 'bg-red-500/5'
                        : 'hover:bg-surface/60'
                    ].join(' ')}
                  >
                    <td className="px-4 py-3 font-mono font-medium">{s.ticketNumber}</td>
                    <td className="px-4 py-3">
                      <div>{formatDateTime(s.createdAt)}</div>
                      {s.status === 'completed' && s.returnedTotal > 0 && (
                        <div className="text-xs text-amber-600">
                          Devuelto:{' '}
                          <MoneyDisplay amount={s.returnedTotal} size="sm" className="inline" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === 'voided' ? 'warning' : 'success'}>
                        {saleStatusLabel(s.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MoneyDisplay
                        amount={s.status === 'voided' ? s.total : s.netTotal}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          type="button"
                          disabled={printingId === s.id}
                          onClick={() => void handleReprint(s)}
                        >
                          {printingId === s.id ? 'Imprimiendo...' : 'Reimprimir'}
                        </Button>
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => setDetailSaleId(s.id)}
                        >
                          Ver
                        </Button>
                        {s.status === 'completed' && (
                          <>
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
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {report && (
          <p className="border-t border-surface-border px-4 py-2 text-xs text-[rgb(var(--text-muted))]">
            Mostrando {filteredSales.length} de {report.allSales.length} ticket(s)
          </p>
        )}
      </section>

      {/* Stock bajo — aviso breve */}
      {stats && stats.lowStockProducts.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <span className="font-medium text-amber-800 dark:text-amber-300">
                Stock bajo:
              </span>{' '}
              {stats.lowStockProducts.length} producto(s)
            </p>
            <Link to="/products" className="text-sm text-brand hover:underline">
              Ver productos
            </Link>
          </div>
        </section>
      )}

      {/* Análisis avanzado (colapsable) */}
      <section className="rounded-xl border border-surface-border">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-elevated/50"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <div>
            <h3 className="font-medium">Más reportes</h3>
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Exportar PDF/Excel, top productos y anulaciones
            </p>
          </div>
          <span className="text-sm text-[rgb(var(--text-muted))]">
            {showAdvanced ? 'Ocultar ▲' : 'Mostrar ▼'}
          </span>
        </button>

        {showAdvanced && report && (
          <div className="space-y-4 border-t border-surface-border p-4">
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
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
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
                title={`Anulaciones (${report.voidedCount})`}
                empty="Sin anulaciones"
                headers={['Ticket', 'Fecha', 'Motivo', 'Total']}
                rows={report.voidedSales.map((s) => [
                  s.ticketNumber,
                  s.voidedAt ? formatDateTime(s.voidedAt) : '—',
                  s.voidReason ?? '—',
                  <MoneyDisplay key="t" amount={s.total} size="sm" />
                ])}
              />
            </div>

            {stats && stats.lowStockProducts.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-amber-500/30">
                <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <h3 className="text-sm font-medium">
                    Stock bajo ({stats.lowStockProducts.length})
                  </h3>
                </div>
                <ul className="max-h-40 divide-y divide-surface-border/60 overflow-y-auto">
                  {stats.lowStockProducts.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
                    >
                      <span>{p.name}</span>
                      <Badge variant="warning">
                        {p.stock} / {p.stockMin}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <SaleDetailModal
        open={detailSaleId != null}
        saleId={detailSaleId}
        onClose={() => setDetailSaleId(null)}
        onVoid={(id) => {
          const row = report?.allSales.find((s) => s.id === id) ?? null
          setDetailSaleId(null)
          if (row) setVoidTarget(row)
        }}
        onReturn={(id) => {
          const row = report?.allSales.find((s) => s.id === id) ?? null
          setDetailSaleId(null)
          if (row) setReturnTarget(row)
        }}
      />

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
          setReturnTarget(null)
          setMessage('Devolución registrada')
          void load()
        }}
      />
    </div>
  )
}

function KpiCard({
  title,
  value,
  suffix,
  children,
  highlight
}: {
  title: string
  value?: number
  suffix?: string
  children?: React.ReactNode
  highlight?: boolean
}): React.JSX.Element {
  return (
    <div
      className={[
        'rounded-xl border border-surface-border bg-surface-elevated p-4',
        highlight ? 'ring-2 ring-amber-500/20' : ''
      ].join(' ')}
    >
      <p className="text-sm text-[rgb(var(--text-muted))]">{title}</p>
      <div className="mt-2">
        {children ?? (
          <span className="text-2xl font-semibold tabular-nums">
            {value}
            {suffix ? (
              <span className="ml-1 text-sm font-normal text-[rgb(var(--text-muted))]">
                {suffix}
              </span>
            ) : null}
          </span>
        )}
      </div>
    </div>
  )
}

function ReportTable({
  title,
  headers,
  rows,
  empty
}: {
  title: string
  headers: string[]
  rows: (string | React.ReactNode)[][]
  empty: string
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border border-surface-border">
      <div className="border-b border-surface-border bg-surface/50 px-4 py-3">
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
    </section>
  )
}
