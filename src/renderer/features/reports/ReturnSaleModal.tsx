import { FormEvent, useEffect, useState } from 'react'
import type { ReportSaleRow } from '@shared/types/reports'
import type { SaleDetail } from '@shared/types/sales'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { formatDateTime } from '../../lib/datetime'

interface ReturnSaleModalProps {
  open: boolean
  sale: ReportSaleRow | null
  onClose: () => void
  onSaved: () => void
}

export function ReturnSaleModal({
  open,
  sale,
  onClose,
  onSaved
}: ReturnSaleModalProps): React.JSX.Element {
  const [detail, setDetail] = useState<SaleDetail | null>(null)
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !sale) {
      setDetail(null)
      return
    }
    setLoading(true)
    setReason('')
    setError(null)
    void window.api.sales.getDetail(sale.id).then((res) => {
      setLoading(false)
      if (!res.ok) {
        setError(res.error)
        setDetail(null)
        return
      }
      setDetail(res.data)
      const initial: Record<number, string> = {}
      for (const item of res.data.items) {
        initial[item.id] = ''
      }
      setQuantities(initial)
    })
  }, [open, sale?.id])

  const returnableItems = detail?.items.filter((i) => i.returnableQuantity > 0) ?? []

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!sale || !detail) return

    const items = returnableItems
      .map((item) => ({
        saleItemId: item.id,
        quantity: Number(quantities[item.id] ?? 0)
      }))
      .filter((l) => l.quantity > 0)

    if (items.length === 0) {
      setError('Indique la cantidad a devolver de al menos un producto')
      return
    }

    setSaving(true)
    setError(null)
    const result = await window.api.sales.partialReturn({
      saleId: sale.id,
      reason: reason.trim(),
      items
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
      title="Devolver productos"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="return-sale-form"
            disabled={saving || loading || returnableItems.length === 0}
          >
            {saving ? 'Guardando...' : 'Registrar devolución'}
          </Button>
        </>
      }
    >
      {sale && (
        <form id="return-sale-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="rounded-lg border border-surface-border bg-surface/50 p-3 text-sm">
            <p>
              Ticket <span className="font-mono font-medium">{sale.ticketNumber}</span> ·{' '}
              {formatDateTime(sale.createdAt)}
            </p>
            <p className="mt-1 text-[rgb(var(--text-muted))]">
              La venta sigue <strong>COMPLETADA</strong>. Solo se devuelve stock y se ajustan los
              totales en reportes.
            </p>
          </div>

          {loading && (
            <p className="text-sm text-[rgb(var(--text-muted))]">Cargando productos...</p>
          )}

          {!loading && returnableItems.length === 0 && (
            <p className="text-sm text-amber-600">
              No hay productos pendientes de devolver en esta venta.
            </p>
          )}

          {!loading && returnableItems.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-surface-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-elevated">
                  <tr className="border-b border-surface-border text-left">
                    <th className="px-3 py-2 font-medium">Producto</th>
                    <th className="px-3 py-2 font-medium text-center">Vendido</th>
                    <th className="px-3 py-2 font-medium text-center">Ya devuelto</th>
                    <th className="px-3 py-2 font-medium text-center">A devolver</th>
                  </tr>
                </thead>
                <tbody>
                  {returnableItems.map((item) => (
                    <tr key={item.id} className="border-b border-surface-border/50">
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{item.quantity}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-amber-600">
                        {item.returnedQuantity}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={item.returnableQuantity}
                          step="any"
                          value={quantities[item.id] ?? ''}
                          onChange={(e) =>
                            setQuantities((q) => ({ ...q, [item.id]: e.target.value }))
                          }
                          placeholder="0"
                          className="w-full rounded border border-surface-border bg-surface-elevated px-2 py-1 text-center tabular-nums"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Input
            label="Motivo de la devolución"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. producto defectuoso, cambio de talla..."
            required
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      )}
    </Modal>
  )
}
