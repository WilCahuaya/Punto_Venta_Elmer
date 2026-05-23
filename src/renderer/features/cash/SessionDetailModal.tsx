import { useCallback, useEffect, useState } from 'react'
import type { CashMovement, CashSessionSummary } from '@shared/types/cash'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatDateTime } from '../../lib/datetime'

interface SessionDetailModalProps {
  open: boolean
  sessionId: number | null
  onClose: () => void
  onOpenTickets?: (sessionId: number) => void
}

export function SessionDetailModal({
  open,
  sessionId,
  onClose,
  onOpenTickets
}: SessionDetailModalProps): React.JSX.Element | null {
  const [summary, setSummary] = useState<CashSessionSummary | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [ticketCount, setTicketCount] = useState(0)

  const load = useCallback(async () => {
    if (!sessionId) return
    const [sRes, mRes, salesRes] = await Promise.all([
      window.api.cash.getSession(sessionId),
      window.api.cash.listMovements(sessionId),
      window.api.sales.listBySession(sessionId)
    ])
    if (sRes.ok) setSummary(sRes.data)
    if (mRes.ok) setMovements(mRes.data)
    if (salesRes.ok) setTicketCount(salesRes.data.length)
  }, [sessionId])

  useEffect(() => {
    if (!open || !sessionId) return
    void load()
  }, [open, sessionId, load])

  if (!open) return null

  return (
    <Modal open={open} title="Detalle de turno" onClose={onClose} size="xl">
        {summary ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={summary.status === 'open' ? 'success' : 'muted'}>
                {summary.status === 'open' ? 'Caja abierta' : 'Caja cerrada'}
              </Badge>
              <span className="text-xs text-[rgb(var(--text-muted))]">
                {formatDateTime(summary.openedAt)}
                {summary.closedAt && ` → ${formatDateTime(summary.closedAt)}`}
                {summary.openedByName && ` · ${summary.openedByName}`}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Apertura" amount={summary.openingAmount} />
              <Stat label="Ventas cobradas" amount={summary.totalSalesGross} />
              <Stat label="Devoluciones" amount={summary.totalReturns} />
              <Stat label="Ventas netas" amount={summary.totalSales} />
              <Stat label="Ingresos manuales" amount={summary.totalIncome} />
              <Stat label="Egresos manuales" amount={summary.totalExpense} />
              <Stat label="Ganancia" amount={summary.salesProfit} />
              <Stat
                label="Esperado en caja"
                amount={summary.expectedAmount ?? summary.expectedInDrawer}
              />
              <Stat label="Diferencia" amount={summary.difference ?? 0} highlight />
            </div>

            {summary.notes && (
              <p className="rounded-lg bg-surface/80 px-3 py-2 text-sm">{summary.notes}</p>
            )}

            {onOpenTickets && sessionId && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface/50 px-4 py-3">
                <span className="text-sm text-[rgb(var(--text-muted))]">
                  {ticketCount} ticket(s) en este turno
                </span>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => onOpenTickets(sessionId)}
                >
                  Ver tickets
                </Button>
              </div>
            )}

            <div>
              <h4 className="mb-3 font-medium">Movimientos manuales</h4>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-surface-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-elevated">
                    <tr>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Concepto</th>
                      <th className="px-3 py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-[rgb(var(--text-muted))]">
                          Sin movimientos manuales
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => (
                        <tr key={m.id} className="border-t border-surface-border/60">
                          <td className="px-3 py-2">
                            <Badge variant={m.type === 'income' ? 'success' : 'warning'}>
                              {m.type === 'income' ? 'Ingreso' : 'Egreso'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{m.concept}</td>
                          <td className="px-3 py-2 text-right">
                            <MoneyDisplay amount={m.amount} size="sm" />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[rgb(var(--text-muted))]">Cargando...</p>
        )}
    </Modal>
  )
}

function Stat({
  label,
  amount,
  highlight
}: {
  label: string
  amount: number
  highlight?: boolean
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-surface-border p-3">
      <p className="text-xs text-[rgb(var(--text-muted))]">{label}</p>
      <MoneyDisplay
        amount={amount}
        size="sm"
        className={highlight ? 'text-amber-600' : ''}
      />
    </div>
  )
}
