import { FormEvent, useEffect, useState } from 'react'
import type { CashSessionSummary } from '@shared/types/cash'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { useCashStore } from '../../stores/cash.store'

interface CloseCashModalProps {
  open: boolean
  summary: CashSessionSummary
  onClose: () => void
}

export function CloseCashModal({ open, summary, onClose }: CloseCashModalProps): React.JSX.Element {
  const [closingAmount, setClosingAmount] = useState(summary.expectedInDrawer)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setClosingAmount(summary.expectedInDrawer)
  }, [open, summary.expectedInDrawer])

  const difference = closingAmount - summary.expectedInDrawer

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await window.api.cash.close({ closingAmount, notes: notes || null })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    useCashStore.getState().setCurrent(null)
    onClose()
    void useCashStore.getState().refresh()
  }

  return (
    <Modal
      open={open}
      title="Cerrar caja"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="close-cash-form" disabled={saving}>
            {saving ? 'Cerrando...' : 'Cerrar caja'}
          </Button>
        </>
      }
    >
      <form id="close-cash-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="rounded-lg border border-surface-border bg-surface/50 p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-[rgb(var(--text-muted))]">Esperado en caja</span>
            <MoneyDisplay amount={summary.expectedInDrawer} />
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[rgb(var(--text-muted))]">+ Ventas cobradas</span>
            <MoneyDisplay amount={summary.totalSalesGross} size="sm" />
          </div>
          {summary.totalReturns > 0 && (
            <div className="flex justify-between py-1 text-amber-600">
              <span>− Devoluciones</span>
              <MoneyDisplay amount={summary.totalReturns} size="sm" />
            </div>
          )}
          <div className="flex justify-between py-1">
            <span className="text-[rgb(var(--text-muted))]">= Ventas netas en caja</span>
            <MoneyDisplay amount={summary.totalSales} size="sm" />
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[rgb(var(--text-muted))]">Ganancia ventas</span>
            <MoneyDisplay amount={summary.salesProfit} size="sm" />
          </div>
        </div>

        <MoneyInput
          label="Efectivo contado al cierre"
          value={closingAmount}
          onChange={setClosingAmount}
          required
        />

        <div
          className={[
            'rounded-lg px-3 py-2 text-sm',
            Math.abs(difference) < 0.01
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
          ].join(' ')}
        >
          Diferencia: <MoneyDisplay amount={difference} size="sm" className="inline" />
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Notas (opcional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  )
}
