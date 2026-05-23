import { FormEvent, useEffect, useState } from 'react'
import { roundMoney } from '@shared/lib/currency'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { MoneyInput } from '../../components/ui/MoneyInput'

interface PaymentModalProps {
  open: boolean
  subtotal: number
  discount: number
  total: number
  onClose: () => void
  onConfirm: (amountPaid: number) => Promise<void>
}

export function PaymentModal({
  open,
  subtotal,
  discount,
  total,
  onClose,
  onConfirm
}: PaymentModalProps): React.JSX.Element {
  const [paid, setPaid] = useState(total)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      setPaid(total)
      setError(null)
    }
  }, [open, total])

  const change = roundMoney(Math.max(0, paid - total))
  const quickAmounts = [10, 20, 50, 100, 200].filter((bill) => bill > total)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (paid < total) {
      setError('El monto recibido es insuficiente')
      return
    }
    setSaving(true)
    setError(null)
    await onConfirm(paid)
    setSaving(false)
  }

  return (
    <Modal
      open={open}
      title="Cobrar"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="pay-form" disabled={saving}>
            {saving ? 'Procesando...' : 'Confirmar venta'}
          </Button>
        </>
      }
    >
      <form id="pay-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-2 rounded-lg border border-surface-border p-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <MoneyDisplay amount={subtotal} size="sm" />
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>Descuento</span>
              <MoneyDisplay amount={discount} size="sm" />
            </div>
          )}
          <div className="flex justify-between border-t border-surface-border pt-2 text-lg font-semibold">
            <span>Total</span>
            <MoneyDisplay amount={total} size="lg" />
          </div>
        </div>

        <MoneyInput label="Monto recibido" value={paid} onChange={setPaid} required />

        <div className="rounded-lg bg-emerald-500/10 px-4 py-3 text-center">
          <p className="text-xs text-[rgb(var(--text-muted))]">Vuelto</p>
          <MoneyDisplay amount={change} size="lg" className="text-emerald-600" />
        </div>

        <div className="flex flex-wrap gap-2">
          {quickAmounts.map((bill) => (
            <Button
              key={bill}
              type="button"
              variant="secondary"
              onClick={() => setPaid(roundMoney(bill))}
            >
              {bill}
            </Button>
          ))}
          <Button type="button" variant="ghost" onClick={() => setPaid(total)}>
            Exacto
          </Button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  )
}
