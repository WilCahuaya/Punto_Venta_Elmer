import { useCallback, useEffect, useState } from 'react'
import type { CashSessionSummary } from '@shared/types/cash'
import type { SaleListEntry } from '@shared/types/sales'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { Select } from '../../components/ui/Select'
import { ReturnSaleModal } from '../reports/ReturnSaleModal'
import { VoidSaleModal } from '../reports/VoidSaleModal'
import { SaleDetailModal } from '../sales/SaleDetailModal'
import { SalesListTable } from '../sales/SalesListTable'
import { formatDateTime } from '../../lib/datetime'
import { useCashStore } from '../../stores/cash.store'

interface SessionOption {
  value: string
  label: string
  summary: CashSessionSummary
}

interface CashTicketsPanelProps {
  /** Preseleccionar turno (p. ej. desde detalle de cierre). */
  initialSessionId?: number | null
  onUpdated?: () => void
}

export function CashTicketsPanel({
  initialSessionId,
  onUpdated
}: CashTicketsPanelProps): React.JSX.Element {
  const cashCurrent = useCashStore((s) => s.current)
  const refreshCash = useCashStore((s) => s.refresh)

  const [sessionOptions, setSessionOptions] = useState<SessionOption[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [sales, setSales] = useState<SaleListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const [detailSaleId, setDetailSaleId] = useState<number | null>(null)
  const [voidSale, setVoidSale] = useState<SaleListEntry | null>(null)
  const [returnSale, setReturnSale] = useState<SaleListEntry | null>(null)

  const selectedSession = sessionOptions.find((o) => o.value === selectedSessionId)?.summary

  const loadSessions = useCallback(async () => {
    await refreshCash()
    const options: SessionOption[] = []

    const currentRes = await window.api.cash.getCurrent()
    if (currentRes.ok && currentRes.data) {
      const s = currentRes.data
      options.push({
        value: String(s.id),
        label: `Turno actual — ${formatDateTime(s.openedAt)}`,
        summary: s
      })
    }

    const histRes = await window.api.cash.history({ limit: 60 })
    if (histRes.ok) {
      for (const s of histRes.data) {
        options.push({
          value: String(s.id),
          label: `Cerrada ${s.closedAt ? formatDateTime(s.closedAt) : ''} · Neto ${s.totalSales.toFixed(2)}`,
          summary: s
        })
      }
    }

    setSessionOptions(options)
    if (options.length > 0) {
      const preferredId =
        initialSessionId != null && options.some((o) => o.value === String(initialSessionId))
          ? String(initialSessionId)
          : currentRes.ok && currentRes.data
            ? String(currentRes.data.id)
            : options[0].value
      setSelectedSessionId((prev) =>
        options.some((o) => o.value === prev) ? prev : preferredId
      )
    } else {
      setSelectedSessionId('')
    }
  }, [refreshCash, initialSessionId])

  const loadSales = useCallback(async () => {
    if (!selectedSessionId) {
      setSales([])
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await window.api.sales.listBySession(Number(selectedSessionId))
    setLoading(false)
    if (res.ok) setSales(res.data)
    else setSales([])
  }, [selectedSessionId])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  useEffect(() => {
    void loadSales()
  }, [loadSales])

  useEffect(() => {
    if (initialSessionId != null && sessionOptions.length > 0) {
      const id = String(initialSessionId)
      if (sessionOptions.some((o) => o.value === id)) {
        setSelectedSessionId(id)
      }
    } else if (cashCurrent && sessionOptions.length > 0) {
      const id = String(cashCurrent.id)
      if (sessionOptions.some((o) => o.value === id)) {
        setSelectedSessionId(id)
      }
    }
  }, [cashCurrent?.id, initialSessionId, sessionOptions])

  const completedSales = sales.filter((s) => s.status === 'completed')
  const netSessionTotal = completedSales.reduce((sum, s) => sum + s.netTotal, 0)

  function saleToReportRow(s: SaleListEntry) {
    return {
      id: s.id,
      ticketNumber: s.ticketNumber,
      createdAt: s.createdAt,
      subtotal: s.subtotal,
      discount: s.discount,
      total: s.total,
      netTotal: s.netTotal,
      returnedTotal: s.returnedTotal,
      status: s.status,
      voidReason: s.voidReason,
      voidedAt: s.voidedAt,
      voidedByName: s.voidedByName,
      itemCount: s.itemCount
    }
  }

  function afterChange(): void {
    void loadSales()
    void refreshCash()
    onUpdated?.()
  }

  return (
    <div>
      <p className="mb-4 text-sm text-[rgb(var(--text-muted))]">
        Tickets del turno seleccionado. Para buscar por fecha o reimprimir, vaya a{' '}
        <span className="text-brand">Inicio</span>.
      </p>

      {message && (
        <p className="mb-4 rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand">{message}</p>
      )}

      {sessionOptions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-8 text-center">
          <p className="text-[rgb(var(--text-muted))]">
            No hay turnos de caja. Abra la caja en la pestaña Turno.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
            <Select
              label="Turno"
              value={selectedSessionId}
              onChange={setSelectedSessionId}
              options={sessionOptions.map((o) => ({ value: o.value, label: o.label }))}
            />
            {selectedSession && (
              <div className="flex flex-wrap items-end gap-3 pb-1">
                <Badge variant={selectedSession.status === 'open' ? 'success' : 'muted'}>
                  {selectedSession.status === 'open' ? 'Abierto' : 'Cerrado'}
                </Badge>
                <div className="text-sm">
                  <span className="text-[rgb(var(--text-muted))]">Neto: </span>
                  <MoneyDisplay amount={netSessionTotal} size="sm" className="inline font-semibold" />
                </div>
                <span className="text-sm text-[rgb(var(--text-muted))]">{sales.length} ticket(s)</span>
              </div>
            )}
          </div>

          <div className="mb-3 flex justify-end">
            <Button
              variant="secondary"
              type="button"
              onClick={() => void loadSales()}
              disabled={loading}
            >
              Actualizar lista
            </Button>
          </div>

          {loading ? (
            <p className="text-[rgb(var(--text-muted))]">Cargando tickets...</p>
          ) : (
            <SalesListTable
              sales={sales}
              emptyMessage="Sin tickets en este turno"
              onViewDetail={(s) => setDetailSaleId(s.id)}
              onVoid={(s) => setVoidSale(s)}
              onReturn={(s) => setReturnSale(s)}
            />
          )}
        </>
      )}

      <SaleDetailModal
        open={detailSaleId != null}
        saleId={detailSaleId}
        onClose={() => setDetailSaleId(null)}
        onVoid={(id) => {
          const s = sales.find((x) => x.id === id)
          if (s) setVoidSale(s)
        }}
        onReturn={(id) => {
          const s = sales.find((x) => x.id === id)
          if (s) setReturnSale(s)
        }}
      />

      <VoidSaleModal
        open={!!voidSale}
        sale={voidSale ? saleToReportRow(voidSale) : null}
        onClose={() => setVoidSale(null)}
        onConfirm={async (reason) => {
          if (!voidSale) return
          const res = await window.api.sales.void({ saleId: voidSale.id, reason })
          if (!res.ok) {
            setMessage(res.error)
            return
          }
          setMessage(`Venta ${voidSale.ticketNumber} anulada`)
          setVoidSale(null)
          afterChange()
        }}
      />

      <ReturnSaleModal
        open={!!returnSale}
        sale={returnSale ? saleToReportRow(returnSale) : null}
        onClose={() => setReturnSale(null)}
        onSaved={() => {
          setMessage('Devolución registrada')
          afterChange()
        }}
      />
    </div>
  )
}
