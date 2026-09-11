import { useCallback, useEffect, useState } from 'react'
import type { CreditSaleEntry } from '@shared/types/sales'
import { paymentMethodLabel } from '@shared/lib/payment'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { CreditPayModal } from '../../features/credits/CreditPayModal'
import { formatDateTime } from '../../lib/datetime'
import { useCashStore } from '../../stores/cash.store'

export function CreditsPage(): React.JSX.Element {
  const refreshCash = useCashStore((s) => s.refresh)
  const [search, setSearch] = useState('')
  const [includeSettled, setIncludeSettled] = useState(false)
  const [entries, setEntries] = useState<CreditSaleEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payEntry, setPayEntry] = useState<CreditSaleEntry | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await window.api.sales.listCredits({
      search: search.trim() || undefined,
      includeSettled
    })
    setLoading(false)
    if (!res.ok) {
      setError(res.error)
      setEntries([])
      return
    }
    setEntries(res.data)
  }, [search, includeSettled])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 150)
    return () => window.clearTimeout(t)
  }, [load])

  const totalRemaining = entries.reduce((sum, e) => sum + e.remaining, 0)

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Fiados</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Productos fiados, a quién se fió y cuánto deben. Los abonos entran a la caja abierta.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[rgb(var(--text-muted))]">Saldo pendiente</p>
          <MoneyDisplay amount={totalRemaining} size="lg" className="font-semibold" />
        </div>
      </header>

      {message && (
        <p className="mb-4 rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand">{message}</p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input
            label="Buscar"
            placeholder="Nombre, ticket o producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <input
            type="checkbox"
            checked={includeSettled}
            onChange={(e) => setIncludeSettled(e.target.checked)}
          />
          Incluir saldados
        </label>
        <Button variant="secondary" type="button" onClick={() => void load()} disabled={loading}>
          Actualizar
        </Button>
      </div>

      {loading ? (
        <p className="text-[rgb(var(--text-muted))]">Cargando fiados...</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-8 text-center text-[rgb(var(--text-muted))]">
          {search.trim()
            ? 'Ningún fiado coincide con la búsqueda'
            : includeSettled
              ? 'Aún no hay ventas fiadas'
              : 'No hay fiados pendientes'}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const settled = entry.remaining <= 0.004
            const open = expandedId === entry.id
            return (
              <article
                key={entry.id}
                className="rounded-xl border border-surface-border bg-surface-elevated p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{entry.creditTo}</h3>
                      <Badge variant={settled ? 'success' : 'warning'}>
                        {settled ? 'Saldado' : 'Pendiente'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
                      Ticket {entry.ticketNumber} · {formatDateTime(entry.createdAt)}
                    </p>
                    <p className="mt-2 text-sm">
                      {entry.items
                        .map((item) => {
                          const qtyLeft = item.quantity - item.returnedQuantity
                          return qtyLeft > 0
                            ? `${item.productName} × ${qtyLeft}`
                            : `${item.productName} (devuelto)`
                        })
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[rgb(var(--text-muted))]">Debe</p>
                    <MoneyDisplay
                      amount={entry.remaining}
                      size="lg"
                      className={settled ? '' : 'font-semibold text-amber-700 dark:text-amber-400'}
                    />
                    <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                      Cobrado <MoneyDisplay amount={entry.paidTotal} size="sm" className="inline" />
                      {' · '}
                      Neto <MoneyDisplay amount={entry.netTotal} size="sm" className="inline" />
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {!settled && (
                    <Button type="button" onClick={() => setPayEntry(entry)}>
                      Registrar abono
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setExpandedId(open ? null : entry.id)}
                  >
                    {open ? 'Ocultar detalle' : 'Ver cobros'}
                  </Button>
                </div>

                {open && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-surface-border">
                    <table className="w-full text-sm">
                      <thead className="bg-surface">
                        <tr className="text-left">
                          <th className="px-3 py-2 font-medium">Fecha</th>
                          <th className="px-3 py-2 font-medium">Tipo</th>
                          <th className="px-3 py-2 font-medium">Método</th>
                          <th className="px-3 py-2 font-medium text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.payments.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-3 text-[rgb(var(--text-muted))]"
                            >
                              Sin adelanto ni abonos todavía
                            </td>
                          </tr>
                        ) : (
                          entry.payments.map((p) => (
                            <tr key={p.id} className="border-t border-surface-border/50">
                              <td className="px-3 py-2">{formatDateTime(p.createdAt)}</td>
                              <td className="px-3 py-2">
                                {p.kind === 'refund' ? 'Devolución' : 'Abono'}
                              </td>
                              <td className="px-3 py-2">{paymentMethodLabel(p.paymentMethod)}</td>
                              <td className="px-3 py-2 text-right">
                                <MoneyDisplay
                                  amount={p.kind === 'refund' ? -p.amount : p.amount}
                                  size="sm"
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <CreditPayModal
        open={payEntry != null}
        entry={payEntry}
        onClose={() => setPayEntry(null)}
        onPaid={(updated) => {
          setMessage(
            updated.remaining <= 0.004
              ? `Fiado ${updated.ticketNumber} saldado`
              : `Abono registrado en ${updated.ticketNumber}`
          )
          setPayEntry(null)
          void refreshCash()
          void load()
        }}
      />
    </div>
  )
}
