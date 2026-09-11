import { FormEvent, useEffect, useRef, useState } from 'react'
import type { PosProduct } from '@shared/types/sales'
import { roundMoney } from '@shared/lib/currency'
import {
  DOZEN_MIN_UNITS,
  DOZEN_UNITS,
  isCajonEnabled,
  isDozenEnabled,
  isPlanchaEnabled,
  maxPacksForStock,
  minQtyForPackChoice,
  packSalePrice,
  type PackPriceChoice,
  unitsPerPackForChoice
} from '@shared/lib/product-packs'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { MoneyInput } from '../../components/ui/MoneyInput'

interface QuantityModalProps {
  open: boolean
  product: PosProduct | null
  onClose: () => void
  onConfirm: (
    quantity: number,
    unitPrice: number,
    priceLabel: string,
    unitsPerPack: number
  ) => void
}

export function QuantityModal({
  open,
  product,
  onClose,
  onConfirm
}: QuantityModalProps): React.JSX.Element | null {
  const [qty, setQty] = useState(1)
  const [qtyText, setQtyText] = useState('1')
  const [priceChoice, setPriceChoice] = useState<PackPriceChoice>('retail')
  const [manualPrice, setManualPrice] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasWholesale =
    product != null && product.priceWholesale != null && product.priceWholesale > 0
  const hasDozen = product != null && isDozenEnabled(product)
  const hasPlancha = product != null && isPlanchaEnabled(product)
  const hasCajon = product != null && isCajonEnabled(product)

  const unitsPerPack = product ? unitsPerPackForChoice(priceChoice, product) : 1
  const minQty = minQtyForPackChoice(priceChoice)
  const maxQty = product ? maxPacksForStock(product.stock, unitsPerPack) : 0
  const dozenAvailable = Boolean(hasDozen && product && product.stock >= DOZEN_MIN_UNITS)

  function applyQty(next: number, choice: PackPriceChoice = priceChoice): void {
    const min = minQtyForPackChoice(choice)
    const packUnits = product ? unitsPerPackForChoice(choice, product) : 1
    const max = product ? maxPacksForStock(product.stock, packUnits) : 0
    const clamped = Math.min(max, Math.max(min, next))
    setQty(clamped)
    setQtyText(String(clamped))
  }

  useEffect(() => {
    if (open && product) {
      setQty(1)
      setQtyText('1')
      setPriceChoice('retail')
      setManualPrice(product.priceRetail)
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [open, product?.id])

  useEffect(() => {
    if (!open || !product) return
    if (qty > maxQty) {
      const next = maxQty >= minQty ? maxQty : minQty
      setQty(next)
      setQtyText(String(next))
      return
    }
    if (qty < minQty && maxQty >= minQty) {
      setQty(minQty)
      setQtyText(String(minQty))
    }
  }, [open, product, priceChoice, maxQty, minQty, qty])

  function commitQty(): void {
    if (!product) return
    const trimmed = qtyText.trim()
    if (trimmed === '') {
      applyQty(1)
      return
    }
    const n = Number(trimmed)
    if (!Number.isFinite(n)) {
      setQtyText(String(qty))
      return
    }
    applyQty(Math.floor(n))
  }

  if (!open || !product) return null

  function resolveUnitPrice(): number {
    if (priceChoice === 'wholesale' && hasWholesale) {
      return roundMoney(product!.priceWholesale!)
    }
    if (priceChoice === 'dozen' && hasDozen) {
      return roundMoney(product!.priceDozen!)
    }
    if (priceChoice === 'plancha' && hasPlancha) {
      return packSalePrice(product!.pricePlancha!, product!.planchaQty ?? 0)
    }
    if (priceChoice === 'cajon' && hasCajon) {
      return packSalePrice(product!.priceCajon!, product!.cajonQty ?? 0)
    }
    if (priceChoice === 'manual') return roundMoney(manualPrice)
    return roundMoney(product!.priceRetail)
  }

  function resolvePriceLabel(): string {
    if (priceChoice === 'wholesale') return 'Mayor'
    if (priceChoice === 'dozen') return `Docena · desde ${DOZEN_MIN_UNITS} und.`
    if (priceChoice === 'plancha') return `Plancha · ${product!.planchaQty} und.`
    if (priceChoice === 'cajon') return `Cajón · ${product!.cajonQty} und.`
    if (priceChoice === 'manual') return 'Manual'
    return 'Menor'
  }

  const unitPrice = resolveUnitPrice()

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    if (qty < minQty || maxQty < minQty || qty > maxQty) return
    if (unitPrice <= 0) return
    onConfirm(qty, unitPrice, resolvePriceLabel(), unitsPerPack)
    onClose()
  }

  function selectChoice(choice: PackPriceChoice): void {
    setPriceChoice(choice)
    applyQty(Math.max(qty, minQtyForPackChoice(choice)), choice)
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
          <Button type="submit" form="qty-form" disabled={unitPrice <= 0 || maxQty < minQty}>
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
          <PriceOption
            checked={priceChoice === 'retail'}
            onChange={() => selectChoice('retail')}
            label="Precio menor"
            amount={product.priceRetail}
          />
          {hasWholesale && (
            <PriceOption
              checked={priceChoice === 'wholesale'}
              onChange={() => selectChoice('wholesale')}
              label="Precio por mayor"
              amount={product.priceWholesale!}
            />
          )}
          {hasDozen && (
            <PriceOption
              checked={priceChoice === 'dozen'}
              onChange={() => selectChoice('dozen')}
              label={`Docena (desde ${DOZEN_MIN_UNITS} und.)`}
              amount={product.priceDozen!}
              packHintUnits={DOZEN_UNITS}
              packHintAmount={packSalePrice(product.priceDozen!, DOZEN_UNITS)}
              disabled={!dozenAvailable}
            />
          )}
          {hasPlancha && (
            <PriceOption
              checked={priceChoice === 'plancha'}
              onChange={() => selectChoice('plancha')}
              label={`Plancha (${product.planchaQty} und.)`}
              amount={packSalePrice(product.pricePlancha!, product.planchaQty ?? 0)}
              unitAmount={product.pricePlancha!}
              disabled={maxPacksForStock(product.stock, product.planchaQty ?? 0) <= 0}
            />
          )}
          {hasCajon && (
            <PriceOption
              checked={priceChoice === 'cajon'}
              onChange={() => selectChoice('cajon')}
              label={`Cajón (${product.cajonQty} und.)`}
              amount={packSalePrice(product.priceCajon!, product.cajonQty ?? 0)}
              unitAmount={product.priceCajon!}
              disabled={maxPacksForStock(product.stock, product.cajonQty ?? 0) <= 0}
            />
          )}
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-surface-border px-3 py-2 hover:bg-surface-elevated">
            <input
              type="radio"
              name="priceChoice"
              checked={priceChoice === 'manual'}
              onChange={() => selectChoice('manual')}
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
          <span className="text-sm font-medium">
            {unitsPerPack > 1 ? 'Cantidad de empaques' : 'Cantidad'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => applyQty(qty - 1)}
            >
              −
            </Button>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={qtyText}
              onChange={(e) => setQtyText(e.target.value)}
              onBlur={commitQty}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              className="w-full rounded-lg border border-surface-border bg-surface-elevated px-4 py-3 text-center text-2xl font-semibold tabular-nums focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => applyQty(qty + 1)}
            >
              +
            </Button>
          </div>
          {unitsPerPack > 1 && (
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Se descontarán {qty * unitsPerPack} unidades del stock
              {maxQty > 0 ? ` (máx. ${maxQty} empaques)` : ''}
            </p>
          )}
          {priceChoice === 'dozen' && (
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Mínimo {DOZEN_MIN_UNITS} unidades para usar el precio de docena.
            </p>
          )}
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

function PriceOption({
  checked,
  onChange,
  label,
  amount,
  unitAmount,
  packHintUnits,
  packHintAmount,
  disabled
}: {
  checked: boolean
  onChange: () => void
  label: string
  amount: number
  unitAmount?: number
  packHintUnits?: number
  packHintAmount?: number
  disabled?: boolean
}): React.JSX.Element {
  return (
    <label
      className={[
        'flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-surface-elevated'
      ].join(' ')}
    >
      <input
        type="radio"
        name="priceChoice"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-right">
        <MoneyDisplay amount={amount} size="sm" />
        {unitAmount != null && unitAmount > 0 && (
          <span className="block text-[11px] text-[rgb(var(--text-muted))]">
            <MoneyDisplay amount={unitAmount} size="sm" className="inline text-[11px]" /> c/u
          </span>
        )}
        {packHintUnits != null && packHintAmount != null && packHintAmount > 0 && (
          <span className="block text-[11px] text-[rgb(var(--text-muted))]">
            {packHintUnits} und.:{' '}
            <MoneyDisplay amount={packHintAmount} size="sm" className="inline text-[11px]" />
          </span>
        )}
      </span>
    </label>
  )
}
