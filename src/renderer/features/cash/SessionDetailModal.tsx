import { useEffect, useState } from 'react'
import type { CashMovement, CashSessionSummary } from '@shared/types/cash'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { Badge } from '../../components/ui/Badge'
import { formatDateTime } from '../../lib/datetime'

interface SessionDetailModalProps {
  open: boolean
  sessionId: number | null
  onClose: () => void
}

export function SessionDetailModal({
  open,
  sessionId,
  onClose
}: SessionDetailModalProps): React.JSX.Element | null {
  const [summary, setSummary] = useState<CashSessionSummary | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])

  useEffect(() => {
    if (!open || !sessionId) return
    async function load(): Promise<void> {
      const [sRes, mRes] = await Promise.all([
        window.api.cash.getSession(sessionId!),
        window.api.cash.listMovements(sessionId!)
      ])
      if (sRes.ok) setSummary(sRes.data)
      if (mRes.ok) setMovements(mRes.data)
    }
    void load()
  }, [open, sessionId])

  if (!open) return null

  return (
    <Modal open={open} title="Detalle de sesión" onClose={onClose} size="xl">
      {summary ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Apertura" amount={summary.openingAmount} />
            <Stat label="Ingresos" amount={summary.totalIncome} />
            <Stat label="Egresos" amount={summary.totalExpense} />
            <Stat label="Ventas" amount={summary.totalSales} />
            <Stat label="Ganancia" amount={summary.salesProfit} />
            <Stat label="Esperado" amount={summary.expectedAmount ?? summary.expectedInDrawer} />
            <Stat label="Cierre" amount={summary.closingAmount ?? 0} />
            <Stat label="Diferencia" amount={summary.difference ?? 0} highlight />
          </div>

          <p className="text-xs text-[rgb(var(--text-muted))]">
            {formatDateTime(summary.openedAt)}
            {summary.closedAt && ` → ${formatDateTime(summary.closedAt)}`}
            {summary.openedByName && ` · ${summary.openedByName}`}
          </p>

          {summary.notes && (
            <p className="rounded-lg bg-surface/80 px-3 py-2 text-sm">{summary.notes}</p>
          )}

          <h4 className="font-medium">Movimientos</h4>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-surface-border">
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
