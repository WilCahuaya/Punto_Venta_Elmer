import { FormEvent, useEffect, useState } from 'react'
import type { ReportSaleRow } from '@shared/types/reports'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { formatDateTime } from '../../lib/datetime'

interface VoidSaleModalProps {
  open: boolean
  sale: ReportSaleRow | null
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

export function VoidSaleModal({
  open,
  sale,
  onClose,
  onConfirm
}: VoidSaleModalProps): React.JSX.Element {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setReason('')
      setError(null)
    }
  }, [open, sale?.id])

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed) {
      setError('El motivo de anulación es obligatorio')
      return
    }
    if (
      !confirm(
        `¿Anular la venta ${sale?.ticketNumber}?\n\nSe restaurará el stock de los productos no devueltos. Esta acción no se puede deshacer.`
      )
    ) {
      return
    }
    setSaving(true)
    setError(null)
    await onConfirm(trimmed)
    setSaving(false)
  }

  return (
    <Modal
      open={open}
      title="Anular venta"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="void-sale-form" variant="danger" disabled={saving}>
            {saving ? 'Anulando...' : 'Anular venta'}
          </Button>
        </>
      }
    >
      {sale && (
        <form id="void-sale-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="rounded-lg border border-surface-border bg-surface/50 p-3 text-sm">
            <p>
              <span className="text-[rgb(var(--text-muted))]">Ticket:</span>{' '}
              <span className="font-mono font-medium">{sale.ticketNumber}</span>
            </p>
            <p className="mt-1">
              <span className="text-[rgb(var(--text-muted))]">Fecha venta:</span>{' '}
              {formatDateTime(sale.createdAt)}
            </p>
            <p className="mt-1">
              <span className="text-[rgb(var(--text-muted))]">Total:</span>{' '}
              <MoneyDisplay amount={sale.total} size="sm" className="inline" />
            </p>
          </div>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            La venta pasará a estado <strong>ANULADA</strong> y dejará de contar en ingresos y
            ganancias.
          </p>
          <Input
            label="Motivo de anulación"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. error de cobro, cliente canceló..."
            required
            autoFocus
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      )}
    </Modal>
  )
}
