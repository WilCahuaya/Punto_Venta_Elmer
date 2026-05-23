import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CashMovement, CashSessionSummary } from '@shared/types/cash'
import type { SaleListEntry } from '@shared/types/sales'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { CashExpectedBreakdown } from '../../features/cash/CashExpectedBreakdown'
import { CashTicketsPanel } from '../../features/cash/CashTicketsPanel'
import { CASH_TABS, parseCashTab, type CashPageTab } from '../../features/cash/CashPageTabs'
import { CloseCashModal } from '../../features/cash/CloseCashModal'
import { MovementModal } from '../../features/cash/MovementModal'
import { OpenCashModal } from '../../features/cash/OpenCashModal'
import { SessionDetailModal } from '../../features/cash/SessionDetailModal'
import { formatDateTime } from '../../lib/datetime'
import { useCashStore } from '../../stores/cash.store'

export function CashPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseCashTab(searchParams.get('tab'))
  const sessionParam = searchParams.get('session')
  const initialSessionId = sessionParam ? Number(sessionParam) : null

  const current = useCashStore((s) => s.current)
  const isOpen = useCashStore((s) => s.isOpen)
  const refresh = useCashStore((s) => s.refresh)

  const [movements, setMovements] = useState<CashMovement[]>([])
  const [sessionSales, setSessionSales] = useState<SaleListEntry[]>([])
  const [history, setHistory] = useState<CashSessionSummary[]>([])
  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [movementType, setMovementType] = useState<'income' | 'expense' | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)

  function setTab(next: CashPageTab): void {
    const params = new URLSearchParams(searchParams)
    params.set('tab', next)
    if (next !== 'tickets') params.delete('session')
    setSearchParams(params, { replace: true })
  }

  const loadHistory = useCallback(async () => {
    const hRes = await window.api.cash.history({ limit: 30 })
    if (hRes.ok) setHistory(hRes.data)
  }, [])

  const loadTurnLedger = useCallback(async (sessionId: number) => {
    const [mRes, sRes] = await Promise.all([
      window.api.cash.listMovements(sessionId),
      window.api.sales.listBySession(sessionId)
    ])
    if (mRes.ok) setMovements(mRes.data)
    else setMovements([])
    if (sRes.ok) setSessionSales(sRes.data)
    else setSessionSales([])
  }, [])

  const load = useCallback(async () => {
    await refresh()
    await loadHistory()
  }, [refresh, loadHistory])

  const refreshTurn = useCallback(() => {
    void load()
    if (current?.id) void loadTurnLedger(current.id)
  }, [load, loadTurnLedger, current?.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (isOpen && current?.id) {
      void loadTurnLedger(current.id)
    } else {
      setMovements([])
      setSessionSales([])
    }
  }, [isOpen, current?.id, loadTurnLedger])

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Caja</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Turno, efectivo esperado y tickets
          </p>
        </div>
        <Badge variant={isOpen ? 'success' : 'muted'}>
          {isOpen ? 'Caja abierta' : 'Caja cerrada'}
        </Badge>
      </header>

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-surface-border bg-surface-elevated p-1">
        {CASH_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-brand/10 text-brand'
                : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]'
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'turno' && (
        <>
          {isOpen && current ? (
            <>
              <div className="mb-6 grid gap-4 lg:grid-cols-2">
                <CashExpectedBreakdown session={current} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryCard title="Ventas cobradas" amount={current.totalSalesGross} />
                  <SummaryCard
                    title="Devoluciones"
                    amount={current.totalReturns}
                    negative={current.totalReturns > 0}
                  />
                  <SummaryCard title="Ventas netas" amount={current.totalSales} />
                  <SummaryCard title="Ganancia" amount={current.salesProfit} positive />
                </div>
              </div>

              <div className="mb-6 flex flex-wrap gap-2">
                <Button onClick={() => setMovementType('income')}>+ Ingreso</Button>
                <Button variant="secondary" onClick={() => setMovementType('expense')}>
                  − Egreso
                </Button>
                <Button variant="secondary" type="button" onClick={() => setTab('tickets')}>
                  Ver tickets
                </Button>
                <Button variant="secondary" onClick={() => setCloseModal(true)}>
                  Cerrar caja
                </Button>
              </div>

              <section className="mb-8">
                <h3 className="mb-1 font-medium">Movimientos del turno</h3>
                <p className="mb-3 text-xs text-[rgb(var(--text-muted))]">
                  Ventas, ingresos y egresos en orden cronológico
                </p>
                <TurnLedgerTable movements={movements} sales={sessionSales} />
              </section>

              <CloseCashModal
                open={closeModal}
                summary={current}
                onClose={() => {
                  setCloseModal(false)
                  refreshTurn()
                }}
              />
            </>
          ) : (
            <div className="mb-8 rounded-xl border border-dashed border-surface-border p-8 text-center">
              <p className="mb-4 text-[rgb(var(--text-muted))]">
                La caja está cerrada. Abra un turno para vender y registrar movimientos.
              </p>
              <Button onClick={() => setOpenModal(true)}>Abrir caja</Button>
            </div>
          )}

          <OpenCashModal
            open={openModal}
            onClose={() => {
              setOpenModal(false)
              refreshTurn()
            }}
          />

          {movementType && (
            <MovementModal
              open={!!movementType}
              type={movementType}
              onClose={() => setMovementType(null)}
              onSaved={refreshTurn}
            />
          )}
        </>
      )}

      {tab === 'tickets' && (
        <CashTicketsPanel
          initialSessionId={Number.isFinite(initialSessionId) ? initialSessionId : null}
          onUpdated={refreshTurn}
        />
      )}

      {tab === 'cierres' && (
        <section>
          <p className="mb-4 text-sm text-[rgb(var(--text-muted))]">
            Turnos cerrados. Use Ver para el detalle o Tickets para la lista de ventas.
          </p>
          <div className="overflow-hidden rounded-xl border border-surface-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-surface-border bg-surface-elevated">
                <tr>
                  <th className="px-4 py-3 font-medium">Cierre</th>
                  <th className="px-4 py-3 font-medium">Apertura</th>
                  <th className="px-4 py-3 font-medium">Ventas netas</th>
                  <th className="px-4 py-3 font-medium">Esperado</th>
                  <th className="px-4 py-3 font-medium">Contado</th>
                  <th className="px-4 py-3 font-medium">Diferencia</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-[rgb(var(--text-muted))]">
                      Sin historial
                    </td>
                  </tr>
                ) : (
                  history.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-surface-border/60 hover:bg-surface-elevated/40"
                    >
                      <td className="px-4 py-3">
                        {s.closedAt ? formatDateTime(s.closedAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <MoneyDisplay amount={s.openingAmount} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <MoneyDisplay amount={s.totalSales} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <MoneyDisplay amount={s.expectedAmount ?? 0} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <MoneyDisplay amount={s.closingAmount ?? 0} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            Math.abs(s.difference ?? 0) < 0.01 ? '' : 'text-amber-600 font-medium'
                          }
                        >
                          <MoneyDisplay amount={s.difference ?? 0} size="sm" />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() => {
                              const params = new URLSearchParams()
                              params.set('tab', 'tickets')
                              params.set('session', String(s.id))
                              setSearchParams(params)
                            }}
                          >
                            Tickets
                          </Button>
                          <Button variant="ghost" type="button" onClick={() => setDetailId(s.id)}>
                            Ver
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <SessionDetailModal
        open={detailId != null}
        sessionId={detailId}
        onClose={() => setDetailId(null)}
        onOpenTickets={(sessionId) => {
          setDetailId(null)
          const params = new URLSearchParams()
          params.set('tab', 'tickets')
          params.set('session', String(sessionId))
          setSearchParams(params)
        }}
      />
    </div>
  )
}

function SummaryCard({
  title,
  amount,
  positive,
  negative
}: {
  title: string
  amount: number
  positive?: boolean
  negative?: boolean
}): React.JSX.Element {
  return (
    <div
      className={[
        'rounded-xl border border-surface-border bg-surface-elevated p-4',
        negative ? 'border-amber-500/30' : ''
      ].join(' ')}
    >
      <p className="text-xs text-[rgb(var(--text-muted))]">{title}</p>
      <MoneyDisplay
        amount={amount}
        size="lg"
        className={positive ? 'text-emerald-600' : negative ? 'text-amber-600' : ''}
      />
    </div>
  )
}

interface TurnLedgerRow {
  key: string
  createdAt: string
  typeLabel: string
  badgeVariant: 'success' | 'warning' | 'muted' | 'default'
  concept: string
  amount: number
}

function buildTurnLedger(movements: CashMovement[], sales: SaleListEntry[]): TurnLedgerRow[] {
  const rows: TurnLedgerRow[] = []

  for (const m of movements) {
    rows.push({
      key: `m-${m.id}`,
      createdAt: m.createdAt,
      typeLabel: m.type === 'income' ? 'Ingreso' : 'Egreso',
      badgeVariant: m.type === 'income' ? 'success' : 'warning',
      concept: m.reference ? `${m.concept} (${m.reference})` : m.concept,
      amount: m.amount
    })
  }

  for (const s of sales) {
    rows.push({
      key: `s-${s.id}`,
      createdAt: s.createdAt,
      typeLabel: s.status === 'voided' ? 'Venta anulada' : 'Venta',
      badgeVariant: s.status === 'voided' ? 'muted' : 'default',
      concept: s.ticketNumber,
      amount: s.status === 'voided' ? s.total : s.netTotal
    })
  }

  return rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function TurnLedgerTable({
  movements,
  sales
}: {
  movements: CashMovement[]
  sales: SaleListEntry[]
}): React.JSX.Element {
  const rows = buildTurnLedger(movements, sales)

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border">
      <table className="w-full text-sm">
        <thead className="border-b border-surface-border bg-surface-elevated">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Fecha</th>
            <th className="px-4 py-3 text-left font-medium">Tipo</th>
            <th className="px-4 py-3 text-left font-medium">Concepto</th>
            <th className="px-4 py-3 text-right font-medium">Monto</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-[rgb(var(--text-muted))]">
                Sin movimientos en este turno
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key} className="border-b border-surface-border/60">
                <td className="px-4 py-3 text-[rgb(var(--text-muted))]">
                  {formatDateTime(row.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={row.badgeVariant}>{row.typeLabel}</Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs sm:text-sm">{row.concept}</td>
                <td className="px-4 py-3 text-right">
                  <MoneyDisplay amount={row.amount} size="sm" />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
