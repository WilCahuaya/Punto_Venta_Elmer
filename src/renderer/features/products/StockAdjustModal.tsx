import { FormEvent, useEffect, useState } from 'react'
import type { Product } from '@shared/types/catalog'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

interface StockAdjustModalProps {
  open: boolean
  product: Product | null
  onClose: () => void
  onSaved: () => void
}

type Step = 'edit' | 'confirm'

export function StockAdjustModal({
  open,
  product,
  onClose,
  onSaved
}: StockAdjustModalProps): React.JSX.Element {
  const [stock, setStock] = useState(0)
  const [step, setStep] = useState<Step>('edit')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const currentStock = product?.stock ?? 0

  useEffect(() => {
    if (open && product) {
      setStock(product.stock)
      setStep('edit')
      setError(null)
    }
  }, [open, product])

  function handleStockChange(raw: string): void {
    const parsed = Number(raw)
    if (Number.isNaN(parsed)) {
      setStock(currentStock)
      return
    }
    setStock(Math.max(currentStock, parsed))
    setError(null)
  }

  function handleRequestConfirm(e: FormEvent): void {
    e.preventDefault()
    if (!product) return

    if (stock < currentStock) {
      setError(`No puede ser menor al stock actual (${currentStock})`)
      setStock(currentStock)
      return
    }

    if (stock === currentStock) {
      setError('El stock no cambió')
      return
    }

    setError(null)
    setStep('confirm')
  }

  async function handleConfirmSave(): Promise<void> {
    if (!product) return
    setSaving(true)
    setError(null)
    const result = await window.api.products.adjustStock({
      productId: product.id,
      stock
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      setStep('edit')
      return
    }
    onSaved()
    onClose()
  }

  function handleBackToEdit(): void {
    setStep('edit')
    setError(null)
  }

  return (
    <Modal
      open={open}
      title={step === 'edit' ? 'Ajustar stock' : 'Confirmar cambio de stock'}
      onClose={onClose}
      size="sm"
      footer={
        step === 'edit' ? (
          <>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" form="stock-adjust-form" disabled={!product}>
              Continuar
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" type="button" onClick={handleBackToEdit} disabled={saving}>
              Volver
            </Button>
            <Button type="button" onClick={() => void handleConfirmSave()} disabled={saving || !product}>
              {saving ? 'Guardando...' : 'Sí, confirmar'}
            </Button>
          </>
        )
      }
    >
      {product && step === 'edit' && (
        <form id="stock-adjust-form" onSubmit={handleRequestConfirm} className="space-y-4">
          <div>
            <p className="font-medium">{product.name}</p>
            {product.barcode && (
              <p className="font-mono text-xs text-[rgb(var(--text-muted))]">{product.barcode}</p>
            )}
            {product.productCode && (
              <p className="text-xs text-[rgb(var(--text-muted))]">Código: {product.productCode}</p>
            )}
          </div>
          <div className="rounded-lg border border-surface-border bg-surface/60 px-3 py-2 text-sm">
            Stock actual: <span className="font-semibold tabular-nums">{currentStock}</span>
          </div>
          <Input
            label="Nuevo stock"
            type="number"
            min={currentStock}
            step="1"
            value={String(stock)}
            onChange={(e) => handleStockChange(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-[rgb(var(--text-muted))]">
            Solo puede aumentar el stock. No se permite bajar por debajo de {currentStock}.
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      )}

      {product && step === 'confirm' && (
        <div className="space-y-4 text-center">
          <p className="font-medium">{product.name}</p>
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4">
            <p className="text-sm text-[rgb(var(--text-muted))]">¿Confirma este cambio de stock?</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {currentStock}{' '}
              <span className="text-base font-normal text-[rgb(var(--text-muted))]">→</span> {stock}
            </p>
            <p className="mt-1 text-sm text-amber-700">
              +{stock - currentStock} unidad{stock - currentStock === 1 ? '' : 'es'}
            </p>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}
    </Modal>
  )
}
