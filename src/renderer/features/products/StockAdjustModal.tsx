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

export function StockAdjustModal({
  open,
  product,
  onClose,
  onSaved
}: StockAdjustModalProps): React.JSX.Element {
  const [stock, setStock] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && product) {
      setStock(product.stock)
      setError(null)
    }
  }, [open, product])

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
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
      return
    }
    onSaved()
    onClose()
  }

  return (
    <Modal
      open={open}
      title="Ajustar stock"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="stock-adjust-form" disabled={saving || !product}>
            {saving ? 'Guardando...' : 'Guardar stock'}
          </Button>
        </>
      }
    >
      {product && (
        <form id="stock-adjust-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <p className="font-medium">{product.name}</p>
            {product.barcode && (
              <p className="font-mono text-xs text-[rgb(var(--text-muted))]">{product.barcode}</p>
            )}
            {product.productCode && (
              <p className="text-xs text-[rgb(var(--text-muted))]">Código: {product.productCode}</p>
            )}
          </div>
          <Input
            label="Stock actual"
            type="number"
            min={0}
            step="any"
            value={String(stock)}
            onChange={(e) => setStock(Number(e.target.value))}
            autoFocus
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      )}
    </Modal>
  )
}
