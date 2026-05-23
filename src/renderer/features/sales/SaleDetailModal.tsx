import { useEffect, useState } from 'react'
import type { SaleDetail } from '@shared/types/sales'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { formatDateTime } from '../../lib/datetime'

interface SaleDetailModalProps {
  open: boolean
  saleId: number | null
  onClose: () => void
  onVoid?: (saleId: number) => void
  onReturn?: (saleId: number) => void
}

function statusLabel(status: SaleDetail['status']): string {
  return status === 'voided' ? 'ANULADA' : 'COMPLETADA'
}

export function SaleDetailModal({
  open,
  saleId,
  onClose,
  onVoid,
  onReturn
}: SaleDetailModalProps): React.JSX.Element {
  const [detail, setDetail] = useState<SaleDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [printMsg, setPrintMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !saleId) {
      setDetail(null)
      return
    }
    setLoading(true)
    setPrintMsg(null)
    void window.api.sales.getDetail(saleId).then((res) => {
      setLoading(false)
      if (res.ok) setDetail(res.data)
      else setDetail(null)
    })
  }, [open, saleId])

  async function handleReprint(): Promise<void> {
    if (!saleId) return
    const res = await window.api.sales.printTicket(saleId)
    setPrintMsg(res.ok ? 'Ticket enviado a impresora' : res.error)
  }

  return (
    <Modal
      open={open}
      title={detail ? `Venta ${detail.ticketNumber}` : 'Detalle de venta'}
      onClose={onClose}
      size="xl"
      footer={
        detail && (
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cerrar
            </Button>
            <Button variant="secondary" type="button" onClick={() => void handleReprint()}>
              Reimprimir ticket
            </Button>
            {detail.status === 'completed' && onReturn && (
              <Button variant="ghost" type="button" onClick={() => onReturn(detail.id)}>
                Devolver productos
              </Button>
            )}
            {detail.status === 'completed' && onVoid && (
              <Button variant="danger" type="button" onClick={() => onVoid(detail.id)}>
                Anular venta
              </Button>
            )}
          </div>
        )
      }
    >
      {loading && (
        <p className="text-sm text-[rgb(var(--text-muted))]">Cargando detalle...</p>
      )}
      {!loading && !detail && (
        <p className="text-sm text-red-500">No se pudo cargar la venta</p>
      )}
      {detail && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={detail.status === 'voided' ? 'warning' : 'success'}>
              {statusLabel(detail.status)}
            </Badge>
            <span className="text-sm text-[rgb(var(--text-muted))]">
              {formatDateTime(detail.createdAt)}
            </span>
          </div>

          {detail.status === 'voided' && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm">
              <p>
                <span className="text-[rgb(var(--text-muted))]">Anulada:</span>{' '}
                {detail.voidedAt ? formatDateTime(detail.voidedAt) : '—'}
                {detail.voidedByName ? ` · ${detail.voidedByName}` : ''}
              </p>
              {detail.voidReason && (
                <p className="mt-1">
                  <span className="text-[rgb(var(--text-muted))]">Motivo:</span> {detail.voidReason}
                </p>
              )}
            </div>
          )}

          {detail.returnedTotal != null && detail.returnedTotal > 0 && (
            <p className="text-sm text-amber-600">
              Devoluciones registradas:{' '}
              <MoneyDisplay amount={detail.returnedTotal} size="sm" className="inline" />
            </p>
          )}

          <div className="overflow-hidden rounded-lg border border-surface-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Producto</th>
                  <th className="px-3 py-2 font-medium text-center">Cant.</th>
                  <th className="px-3 py-2 font-medium text-right">P. unit.</th>
                  <th className="px-3 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr key={item.id} className="border-t border-surface-border/50">
                    <td className="px-3 py-2">
                      <div>{item.productName}</div>
                      {item.returnedQuantity > 0 && (
                        <div className="text-xs text-amber-600">
                          Devuelto: {item.returnedQuantity}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">
                      <MoneyDisplay amount={item.unitPrice} size="sm" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <MoneyDisplay amount={item.lineTotal} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-2 rounded-lg border border-surface-border bg-surface/50 p-4 text-sm sm:grid-cols-2">
            <div className="flex justify-between sm:block">
              <span className="text-[rgb(var(--text-muted))]">Subtotal</span>
              <MoneyDisplay amount={detail.subtotal} size="sm" />
            </div>
            {detail.discount > 0 && (
              <div className="flex justify-between sm:block">
                <span className="text-[rgb(var(--text-muted))]">Descuento</span>
                <MoneyDisplay amount={detail.discount} size="sm" />
              </div>
            )}
            <div className="flex justify-between sm:block">
              <span className="font-medium">Total</span>
              <MoneyDisplay amount={detail.total} size="lg" />
            </div>
            {detail.netTotal != null && detail.returnedTotal != null && detail.returnedTotal > 0 && (
              <div className="flex justify-between sm:block">
                <span className="text-[rgb(var(--text-muted))]">Neto (tras devoluciones)</span>
                <MoneyDisplay amount={detail.netTotal} size="sm" />
              </div>
            )}
            <div className="flex justify-between sm:block">
              <span className="text-[rgb(var(--text-muted))]">Recibido</span>
              <MoneyDisplay amount={detail.amountPaid} size="sm" />
            </div>
            <div className="flex justify-between sm:block">
              <span className="text-[rgb(var(--text-muted))]">Vuelto</span>
              <MoneyDisplay amount={detail.changeAmount} size="sm" />
            </div>
          </div>

          {printMsg && <p className="text-sm text-brand">{printMsg}</p>}
        </div>
      )}
    </Modal>
  )
}
