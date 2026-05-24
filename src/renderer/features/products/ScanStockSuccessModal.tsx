import type { Product } from '@shared/types/catalog'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'

interface ScanStockSuccessModalProps {
  open: boolean
  product: Product | null
  previousStock: number
  onClose: () => void
  onAdjustMore: () => void
}

export function ScanStockSuccessModal({
  open,
  product,
  previousStock,
  onClose,
  onAdjustMore
}: ScanStockSuccessModalProps): React.JSX.Element {
  return (
    <Modal
      open={open}
      title="Stock actualizado"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onAdjustMore}>
            Ajustar cantidad
          </Button>
          <Button type="button" onClick={onClose}>
            Listo
          </Button>
        </>
      }
    >
      {product && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-2xl text-emerald-600">
            ✓
          </div>
          <div>
            <p className="text-lg font-semibold">{product.name}</p>
            {product.barcode && (
              <p className="mt-1 font-mono text-xs text-[rgb(var(--text-muted))]">
                {product.barcode}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-surface-border bg-surface/60 px-4 py-3">
            <p className="text-sm text-[rgb(var(--text-muted))]">Se agregó 1 unidad al stock</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {previousStock}{' '}
              <span className="text-base font-normal text-[rgb(var(--text-muted))]">→</span>{' '}
              {product.stock}
            </p>
          </div>
        </div>
      )}
    </Modal>
  )
}
