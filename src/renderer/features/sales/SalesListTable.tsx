import type { SaleListEntry } from '@shared/types/sales'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { formatDateTime } from '../../lib/datetime'

interface SalesListTableProps {
  sales: SaleListEntry[]
  emptyMessage?: string
  onViewDetail: (sale: SaleListEntry) => void
  onVoid?: (sale: SaleListEntry) => void
  onReturn?: (sale: SaleListEntry) => void
}

function statusLabel(status: SaleListEntry['status']): string {
  return status === 'voided' ? 'ANULADA' : 'COMPLETADA'
}

export function SalesListTable({
  sales,
  emptyMessage = 'Sin ventas en este turno',
  onViewDetail,
  onVoid,
  onReturn
}: SalesListTableProps): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-surface-border">
      <table className="w-full text-sm">
        <thead className="border-b border-surface-border bg-surface-elevated">
          <tr className="text-left">
            <th className="px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2 font-medium">Ticket</th>
            <th className="px-3 py-2 font-medium">Fecha</th>
            <th className="px-3 py-2 font-medium text-center">Ítems</th>
            <th className="px-3 py-2 font-medium text-right">Total / Neto</th>
            <th className="px-3 py-2 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sales.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-[rgb(var(--text-muted))]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sales.map((s) => (
              <tr
                key={s.id}
                className={[
                  'border-b border-surface-border/50',
                  s.status === 'voided' ? 'bg-red-500/5' : 'hover:bg-surface-elevated/40'
                ].join(' ')}
              >
                <td className="px-3 py-2">
                  <Badge variant={s.status === 'voided' ? 'warning' : 'success'}>
                    {statusLabel(s.status)}
                  </Badge>
                </td>
                <td className="px-3 py-2 font-mono">{s.ticketNumber}</td>
                <td className="px-3 py-2 text-[rgb(var(--text-muted))]">
                  {formatDateTime(s.createdAt)}
                </td>
                <td className="px-3 py-2 text-center tabular-nums">{s.itemCount}</td>
                <td className="px-3 py-2 text-right">
                  {s.status === 'voided' ? (
                    <MoneyDisplay amount={s.total} size="sm" />
                  ) : (
                    <>
                      <MoneyDisplay amount={s.netTotal} size="sm" />
                      {s.returnedTotal > 0 && (
                        <div className="text-xs text-[rgb(var(--text-muted))]">
                          Bruto <MoneyDisplay amount={s.total} size="sm" className="inline" />
                        </div>
                      )}
                    </>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" type="button" onClick={() => onViewDetail(s)}>
                      Ver detalle
                    </Button>
                    {s.status === 'completed' && onReturn && (
                      <Button variant="ghost" type="button" onClick={() => onReturn(s)}>
                        Devolver
                      </Button>
                    )}
                    {s.status === 'completed' && onVoid && (
                      <Button variant="danger" type="button" onClick={() => onVoid(s)}>
                        Anular
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
