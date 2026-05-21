import { FormEvent, useEffect, useRef, useState } from 'react'
import type { PosProduct } from '@shared/types/sales'
import { roundMoney } from '@shared/lib/currency'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { MoneyInput } from '../../components/ui/MoneyInput'

type PriceChoice = 'retail' | 'wholesale' | 'manual'

interface QuantityModalProps {
  open: boolean
  product: PosProduct | null
  onClose: () => void
  onConfirm: (quantity: number, unitPrice: number, priceLabel: string) => void
}

export function QuantityModal({
  open,
  product,
  onClose,
  onConfirm
}: QuantityModalProps): React.JSX.Element | null {
  const [qty, setQty] = useState(1)
  const [priceChoice, setPriceChoice] = useState<PriceChoice>('retail')
  const [manualPrice, setManualPrice] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasWholesale =
    product != null && product.priceWholesale != null && product.priceWholesale > 0

  useEffect(() => {
    if (open && product) {
      setQty(1)
      setPriceChoice('retail')
      setManualPrice(product.priceRetail)
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [open, product?.id])

  if (!open || !product) return null

  function resolveUnitPrice(): number {
    if (priceChoice === 'wholesale' && hasWholesale) {
      return roundMoney(product!.priceWholesale!)
    }
    if (priceChoice === 'manual') return roundMoney(manualPrice)
    return roundMoney(product!.priceRetail)
  }

  function resolvePriceLabel(): string {
    if (priceChoice === 'wholesale') return 'Mayor'
    if (priceChoice === 'manual') return 'Manual'
    return 'Menor'
  }

  const unitPrice = resolveUnitPrice()

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    if (qty <= 0 || qty > product!.stock) return
    if (unitPrice <= 0) return
    onConfirm(qty, unitPrice, resolvePriceLabel())
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
            Cancelar
          </Button>
          <Button type="submit" form="qty-form" disabled={unitPrice <= 0}>
            Agregar
          </Button>
        </>
      }
    >
      <form id="qty-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[rgb(var(--text-muted))]">Stock disponible</span>
          <span className="font-semibold tabular-nums">{product.stock}</span>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Precio de venta</legend>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-border px-3 py-2 hover:bg-surface-elevated">
            <input
              type="radio"
              name="priceChoice"
              checked={priceChoice === 'retail'}
              onChange={() => setPriceChoice('retail')}
            />
            <span className="flex-1 text-sm">Precio menor</span>
            <MoneyDisplay amount={product.priceRetail} size="sm" />
          </label>
          {hasWholesale && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-border px-3 py-2 hover:bg-surface-elevated">
              <input
                type="radio"
                name="priceChoice"
                checked={priceChoice === 'wholesale'}
                onChange={() => setPriceChoice('wholesale')}
              />
              <span className="flex-1 text-sm">Precio por mayor</span>
              <MoneyDisplay amount={product.priceWholesale!} size="sm" />
            </label>
          )}
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-surface-border px-3 py-2 hover:bg-surface-elevated">
            <input
              type="radio"
              name="priceChoice"
              checked={priceChoice === 'manual'}
              onChange={() => setPriceChoice('manual')}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <span className="text-sm">Precio manual</span>
              {priceChoice === 'manual' && (
                <MoneyInput
                  label=""
                  value={manualPrice}
                  onChange={setManualPrice}
                />
              )}
            </div>
          </label>
        </fieldset>

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
          <span className="text-sm text-[rgb(var(--text-muted))]">
            Subtotal ({resolvePriceLabel()}):{' '}
          </span>
          <MoneyDisplay amount={unitPrice * qty} size="lg" />
        </div>
      </form>
    </Modal>
  )
}
