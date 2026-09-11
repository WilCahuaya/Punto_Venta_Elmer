import { FormEvent, useEffect, useState } from 'react'
import { roundMoney } from '@shared/lib/currency'
import type { PaymentMethod } from '@shared/lib/payment'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { MoneyInput } from '../../components/ui/MoneyInput'

export interface PaymentConfirmPayload {
  amountPaid: number
  paymentMethod: PaymentMethod
  isCredit?: boolean
  creditTo?: string
}

type ChargeMode = PaymentMethod | 'credit'

interface PaymentModalProps {
  open: boolean
  subtotal: number
  discount: number
  total: number
  onClose: () => void
  onConfirm: (payload: PaymentConfirmPayload) => Promise<void>
}

export function PaymentModal({
  open,
  subtotal,
  discount,
  total,
  onClose,
  onConfirm
}: PaymentModalProps): React.JSX.Element {
  const [mode, setMode] = useState<ChargeMode>('cash')
  const [paid, setPaid] = useState(total)
  const [creditTo, setCreditTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setMode('cash')
      setPaid(total)
      setCreditTo('')
      setError(null)
      setSaving(false)
    }
  }, [open, total])

  const isCredit = mode === 'credit'
  const paymentMethod: PaymentMethod = mode === 'yape' ? 'yape' : 'cash'
  const remaining = isCredit ? roundMoney(Math.max(0, total - paid)) : 0
  const change = mode === 'cash' ? roundMoney(Math.max(0, paid - total)) : 0
  const quickAmounts = [10, 20, 50, 100, 200].filter((bill) => bill > total)

  function selectMode(next: ChargeMode): void {
    setMode(next)
    setError(null)
    if (next === 'yape') setPaid(total)
    if (next === 'credit') setPaid(0)
    if (next === 'cash') setPaid(total)
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (isCredit) {
      if (!creditTo.trim()) {
        setError('Indique a quién se fía')
        return
      }
      if (paid < 0) {
        setError('El adelanto no puede ser negativo')
        return
      }
      if (paid >= total) {
        setError('Si cubre el total, use Efectivo o Yape')
        return
      }
    } else if (mode === 'cash' && paid < total) {
      setError('El monto recibido es insuficiente')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onConfirm({
        amountPaid: isCredit ? paid : mode === 'yape' ? total : paid,
        paymentMethod,
        isCredit,
        creditTo: isCredit ? creditTo.trim() : undefined
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Cobrar"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="pay-form" disabled={saving}>
            {saving
              ? 'Procesando...'
              : isCredit
                ? 'Registrar fiado'
                : mode === 'yape'
                  ? 'Confirmar Yape'
                  : 'Confirmar venta'}
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

        <div>
          <p className="mb-2 text-sm font-medium">Método de pago</p>
          <div className="grid grid-cols-3 gap-2">
            <MethodButton
              selected={mode === 'cash'}
              onClick={() => selectMode('cash')}
              title="Efectivo"
              subtitle="Billetes y vuelto"
            />
            <MethodButton
              selected={mode === 'yape'}
              onClick={() => selectMode('yape')}
              title="Yape"
              subtitle="Pago al celular"
              accent="yape"
            />
            <MethodButton
              selected={isCredit}
              onClick={() => selectMode('credit')}
              title="Fiar"
              subtitle="Paga después"
              accent="credit"
            />
          </div>
        </div>

        {mode === 'cash' && (
          <>
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
          </>
        )}

        {mode === 'yape' && (
          <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-3 text-sm">
            <p className="font-medium text-fuchsia-800 dark:text-fuchsia-300">
              Confirme el pago en el celular
            </p>
            <p className="mt-1 text-[rgb(var(--text-muted))]">
              El cliente debe haber enviado{' '}
              <MoneyDisplay amount={total} size="sm" className="inline font-semibold" /> por Yape.
              Este cobro no entra al efectivo de caja.
            </p>
          </div>
        )}

        {isCredit && (
          <>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[rgb(var(--text))]">
                A quién se fía <span className="text-red-500">*</span>
              </span>
              <textarea
                value={creditTo}
                onChange={(e) => setCreditTo(e.target.value)}
                required
                rows={3}
                maxLength={500}
                placeholder="Nombre, teléfono, nota… lo que necesite para reconocerlo"
                className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5 text-[rgb(var(--text))] placeholder:text-[rgb(var(--text-muted))] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>

            <MoneyInput
              label="Adelanto (opcional)"
              value={paid}
              onChange={setPaid}
            />
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Puede ser 0. El adelanto entra a la caja de este turno.
            </p>

            <div className="rounded-lg bg-amber-500/10 px-4 py-3 text-center">
              <p className="text-xs text-[rgb(var(--text-muted))]">Queda debiendo</p>
              <MoneyDisplay amount={remaining} size="lg" className="text-amber-700 dark:text-amber-400" />
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  )
}

function MethodButton({
  selected,
  onClick,
  title,
  subtitle,
  accent = 'cash'
}: {
  selected: boolean
  onClick: () => void
  title: string
  subtitle: string
  accent?: 'cash' | 'yape' | 'credit'
}): React.JSX.Element {
  const selectedClass =
    accent === 'yape'
      ? 'border-fuchsia-500 bg-fuchsia-500/10 ring-2 ring-fuchsia-500/40'
      : accent === 'credit'
        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40'
        : 'border-brand bg-brand/10 ring-2 ring-brand/40'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'rounded-xl border px-3 py-3 text-left transition-colors',
        selected
          ? selectedClass
          : 'border-surface-border bg-surface-elevated hover:bg-surface-border/30'
      ].join(' ')}
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-0.5 block text-xs text-[rgb(var(--text-muted))]">{subtitle}</span>
    </button>
  )
}
