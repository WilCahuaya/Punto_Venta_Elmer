import { useCallback, useEffect, useState } from 'react'
import type { CashMovement, CashSessionSummary } from '@shared/types/cash'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { CloseCashModal } from '../../features/cash/CloseCashModal'
import { MovementModal } from '../../features/cash/MovementModal'
import { OpenCashModal } from '../../features/cash/OpenCashModal'
import { SessionDetailModal } from '../../features/cash/SessionDetailModal'
import { formatDateTime } from '../../lib/datetime'
import { useCashStore } from '../../stores/cash.store'

export function CashPage(): React.JSX.Element {
  const current = useCashStore((s) => s.current)
  const isOpen = useCashStore((s) => s.isOpen)
  const refresh = useCashStore((s) => s.refresh)

  const [movements, setMovements] = useState<CashMovement[]>([])
  const [history, setHistory] = useState<CashSessionSummary[]>([])
  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [movementType, setMovementType] = useState<'income' | 'expense' | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)

  const load = useCallback(async () => {
    await refresh()
    const mRes = await window.api.cash.listMovements()
    if (mRes.ok) setMovements(mRes.data)
    const hRes = await window.api.cash.history({ limit: 30 })
    if (hRes.ok) setHistory(hRes.data)
  }, [refresh])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Caja</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Apertura, cierre, ingresos y egresos del turno
          </p>
        </div>
        <Badge variant={isOpen ? 'success' : 'muted'}>
          {isOpen ? 'Caja abierta' : 'Caja cerrada'}
        </Badge>
      </header>

      {isOpen && current ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SummaryCard title="Apertura" amount={current.openingAmount} />
            <SummaryCard title="Ingresos" amount={current.totalIncome} positive />
            <SummaryCard title="Egresos" amount={current.totalExpense} negative />
            <SummaryCard title="Ventas" amount={current.totalSales} />
            <SummaryCard title="Ganancia ventas" amount={current.salesProfit} />
            <SummaryCard title="En caja (esperado)" amount={current.expectedInDrawer} highlight />
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <Button onClick={() => setMovementType('income')}>+ Ingreso</Button>
            <Button variant="secondary" onClick={() => setMovementType('expense')}>
              − Egreso
            </Button>
            <Button variant="secondary" onClick={() => setCloseModal(true)}>
              Cerrar caja
            </Button>
          </div>

          <section className="mb-8">
            <h3 className="mb-3 font-medium">Movimientos del turno</h3>
            <MovementsTable movements={movements} />
          </section>

          <CloseCashModal
            open={closeModal}
            summary={current}
            onClose={() => {
              setCloseModal(false)
              void load()
            }}
          />
        </>
      ) : (
        <div className="mb-8 rounded-xl border border-dashed border-surface-border p-8 text-center">
          <p className="mb-4 text-[rgb(var(--text-muted))]">
            La caja está cerrada. Abra un turno para registrar ventas y movimientos.
          </p>
          <Button onClick={() => setOpenModal(true)}>Abrir caja</Button>
        </div>
      )}

      <OpenCashModal
        open={openModal}
        onClose={() => {
          setOpenModal(false)
          void load()
        }}
      />

      {movementType && (
        <MovementModal
          open={!!movementType}
          type={movementType}
          onClose={() => setMovementType(null)}
          onSaved={() => void load()}
        />
      )}

      <section>
        <h3 className="mb-3 font-medium">Historial de cierres</h3>
        <div className="overflow-hidden rounded-xl border border-surface-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-surface-border bg-surface-elevated">
              <tr>
                <th className="px-4 py-3 font-medium">Cierre</th>
                <th className="px-4 py-3 font-medium">Apertura</th>
                <th className="px-4 py-3 font-medium">Ventas</th>
                <th className="px-4 py-3 font-medium">Esperado</th>
                <th className="px-4 py-3 font-medium">Contado</th>
                <th className="px-4 py-3 font-medium">Diferencia</th>
                <th className="px-4 py-3 font-medium text-right">Detalle</th>
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
                    <td className="px-4 py-3">{s.closedAt ? formatDateTime(s.closedAt) : '—'}</td>
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
                      <Button variant="ghost" type="button" onClick={() => setDetailId(s.id)}>
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <SessionDetailModal
        open={detailId != null}
        sessionId={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  )
}

function SummaryCard({
  title,
  amount,
  highlight,
  positive,
  negative
}: {
  title: string
  amount: number
  highlight?: boolean
  positive?: boolean
  negative?: boolean
}): React.JSX.Element {
  return (
    <div
      className={[
        'rounded-xl border border-surface-border bg-surface-elevated p-4',
        highlight ? 'ring-2 ring-brand/30' : ''
      ].join(' ')}
    >
      <p className="text-xs text-[rgb(var(--text-muted))]">{title}</p>
      <MoneyDisplay
        amount={amount}
        size="lg"
        className={
          positive ? 'text-emerald-600' : negative ? 'text-red-500' : ''
        }
      />
    </div>
  )
}

function MovementsTable({ movements }: { movements: CashMovement[] }): React.JSX.Element {
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
          {movements.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-[rgb(var(--text-muted))]">
                Sin movimientos registrados
              </td>
            </tr>
          ) : (
            movements.map((m) => (
              <tr key={m.id} className="border-b border-surface-border/60">
                <td className="px-4 py-3 text-[rgb(var(--text-muted))]">
                  {formatDateTime(m.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={m.type === 'income' ? 'success' : 'warning'}>
                    {m.type === 'income' ? 'Ingreso' : 'Egreso'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {m.concept}
                  {m.reference && (
                    <span className="ml-1 text-xs text-[rgb(var(--text-muted))]">
                      ({m.reference})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <MoneyDisplay amount={m.amount} size="sm" />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
