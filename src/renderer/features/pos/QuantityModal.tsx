import { FormEvent, useEffect, useRef, useState } from 'react'
import type { PosProduct } from '@shared/types/sales'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'

interface QuantityModalProps {
  open: boolean
  product: PosProduct | null
  onClose: () => void
  onConfirm: (quantity: number) => void
}

export function QuantityModal({
  open,
  product,
  onClose,
  onConfirm
}: QuantityModalProps): React.JSX.Element | null {
  const [qty, setQty] = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQty(1)
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [open, product?.id])

  if (!open || !product) return null

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    if (qty <= 0 || qty > product!.stock) return
    onConfirm(qty)
    onClose()
  }

  return (
    <Modal
      open={open}
      title={product.name}
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Esc — Cancelar
          </Button>
          <Button type="submit" form="qty-form">
            Enter — Agregar
          </Button>
        </>
      }
    >
      <form id="qty-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[rgb(var(--text-muted))]">Stock disponible</span>
          <span className="font-semibold tabular-nums">{product.stock}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[rgb(var(--text-muted))]">Precio unitario</span>
          <MoneyDisplay amount={product.unitPrice} />
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Cantidad</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              −
            </Button>
            <input
              ref={inputRef}
              type="number"
              min={1}
              max={product.stock}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-full rounded-lg border border-surface-border bg-surface-elevated px-4 py-3 text-center text-2xl font-semibold tabular-nums focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            >
              +
            </Button>
          </div>
        </label>

        <div className="rounded-lg bg-brand/5 px-3 py-2 text-center">
          <span className="text-sm text-[rgb(var(--text-muted))]">Subtotal línea: </span>
          <MoneyDisplay amount={product.unitPrice * qty} size="lg" />
        </div>
      </form>
    </Modal>
  )
}
