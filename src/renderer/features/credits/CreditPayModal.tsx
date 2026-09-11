import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { roundMoney } from '@shared/lib/currency'
import type { PaymentMethod } from '@shared/lib/payment'
import { paymentMethodLabel } from '@shared/lib/payment'
import type { CreditSaleEntry } from '@shared/types/sales'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { useCashStore } from '../../stores/cash.store'

interface CreditPayModalProps {
  open: boolean
  entry: CreditSaleEntry | null
  onClose: () => void
  onPaid: (entry: CreditSaleEntry) => void
}

export function CreditPayModal({
  open,
  entry,
  onClose,
  onPaid
}: CreditPayModalProps): React.JSX.Element {
  const isOpen = useCashStore((s) => s.isOpen)
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && entry) {
      setAmount(entry.remaining)
      setMethod('cash')
      setError(null)
      setSaving(false)
    }
  }, [open, entry])

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!entry) return
    if (!isOpen) {
      setError('Abra la caja para registrar el abono')
      return
    }
    const paid = roundMoney(amount)
    if (paid <= 0) {
      setError('El monto debe ser mayor a cero')
      return
    }
    if (paid > entry.remaining + 0.004) {
      setError('El abono no puede ser mayor al saldo')
      return
    }
    setSaving(true)
    setError(null)
    const res = await window.api.sales.payCredit({
      saleId: entry.id,
      amount: paid,
      paymentMethod: method
    })
    setSaving(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    onPaid(res.data)
  }

  return (
    <Modal
      open={open}
      title={entry ? `Cobrar fiado ${entry.ticketNumber}` : 'Cobrar fiado'}
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="credit-pay-form" disabled={saving || !isOpen || !entry}>
            {saving ? 'Registrando...' : 'Registrar abono'}
          </Button>
        </>
      }
    >
      {entry && (
        <form id="credit-pay-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="rounded-lg border border-surface-border p-3 text-sm">
            <p className="font-medium">{entry.creditTo}</p>
            <p className="mt-1 text-[rgb(var(--text-muted))]">
              Ticket {entry.ticketNumber}
            </p>
            <div className="mt-2 flex justify-between">
              <span>Saldo</span>
              <MoneyDisplay amount={entry.remaining} size="sm" className="font-semibold" />
            </div>
          </div>

          {!isOpen && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              La caja está cerrada.{' '}
              <Link to="/cash" className="font-medium underline">
                Abrir caja
              </Link>
            </p>
          )}

          <div>
            <p className="mb-2 text-sm font-medium">Método</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={[
                  'rounded-xl border px-3 py-2 text-left text-sm',
                  method === 'cash'
                    ? 'border-brand bg-brand/10 ring-2 ring-brand/40'
                    : 'border-surface-border'
                ].join(' ')}
              >
                Efectivo
              </button>
              <button
                type="button"
                onClick={() => setMethod('yape')}
                className={[
                  'rounded-xl border px-3 py-2 text-left text-sm',
                  method === 'yape'
                    ? 'border-fuchsia-500 bg-fuchsia-500/10 ring-2 ring-fuchsia-500/40'
                    : 'border-surface-border'
                ].join(' ')}
              >
                Yape
              </button>
            </div>
            {method === 'yape' && (
              <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">
                El Yape no entra al efectivo del cajón.
              </p>
            )}
          </div>

          <MoneyInput label="Monto a cobrar" value={amount} onChange={setAmount} required />
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAmount(entry.remaining)}
          >
            Saldo exacto ({paymentMethodLabel(method)})
          </Button>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      )}
    </Modal>
  )
}
