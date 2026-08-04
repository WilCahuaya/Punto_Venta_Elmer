import { useEffect, useMemo, useState } from 'react'
import type { SaleDetail } from '@shared/types/sales'
import type { PrinterInfo } from '@shared/types/settings'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { Select } from '../../components/ui/Select'
import { useLogoImage } from '../../hooks/useLogoImage'
import { useSettingsStore } from '../../stores/settings.store'

interface PrintTicketPromptModalProps {
  open: boolean
  saleId: number | null
  ticketNumber: string
  onPrint: (printerName: string) => Promise<void>
  onSkip: () => void
}

function TicketRow({
  label,
  children,
  strong
}: {
  label: string
  children: React.ReactNode
  strong?: boolean
}): React.JSX.Element {
  return (
    <div
      className={[
        'flex items-baseline justify-between gap-3',
        strong ? 'text-sm font-bold' : ''
      ].join(' ')}
    >
      <span>{label}</span>
      <span className="text-right tabular-nums">{children}</span>
    </div>
  )
}

export function PrintTicketPromptModal({
  open,
  saleId,
  ticketNumber,
  onPrint,
  onSkip
}: PrintTicketPromptModalProps): React.JSX.Element {
  const companyName = useSettingsStore((s) => s.companyName)
  const companyAddress = useSettingsStore((s) => s.companyAddress)
  const companyLogoPath = useSettingsStore((s) => s.companyLogoPath)
  const ticketLogoWidthPercent = useSettingsStore((s) => s.ticketLogoWidthPercent)
  const ticketSlogan = useSettingsStore((s) => s.ticketSlogan)
  const printerPaperWidth = useSettingsStore((s) => s.printerPaperWidth)
  const defaultPrinter = useSettingsStore((s) => s.printerTicket)
  const logoUrl = useLogoImage(companyLogoPath)

  const [printing, setPrinting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<SaleDetail | null>(null)
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [printerName, setPrinterName] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  const previewMaxWidth = printerPaperWidth === '80mm' ? 340 : 280

  useEffect(() => {
    if (!open || saleId == null) {
      setDetail(null)
      setLoadError(null)
      setPrinting(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setPrinting(false)

    void (async () => {
      const [detailRes, printersRes] = await Promise.all([
        window.api.sales.getDetail(saleId),
        window.api.settings.listPrinters()
      ])
      if (cancelled) return

      if (!detailRes.ok) {
        setDetail(null)
        setLoadError(detailRes.error)
      } else {
        setDetail(detailRes.data)
      }

      const list = printersRes.ok ? printersRes.data : []
      setPrinters(list)

      const preferred =
        list.find((p) => p.name === defaultPrinter)?.name ??
        list.find((p) => p.isDefault)?.name ??
        list[0]?.name ??
        defaultPrinter ??
        ''
      setPrinterName(preferred)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [open, saleId, defaultPrinter])

  const printerOptions = useMemo(
    () =>
      printers.map((p) => ({
        value: p.name,
        label: p.isDefault ? `${p.displayName} (predeterminada)` : p.displayName
      })),
    [printers]
  )

  async function handlePrint(): Promise<void> {
    if (!printerName.trim()) {
      setLoadError('Seleccione una impresora')
      return
    }
    setPrinting(true)
    setLoadError(null)
    try {
      await onPrint(printerName.trim())
    } finally {
      setPrinting(false)
    }
  }

  return (
    <Modal
      open={open}
      title="¿Imprimir ticket?"
      onClose={onSkip}
      size="md"
      footer={
        <>
          <Button variant="secondary" type="button" disabled={printing} onClick={onSkip}>
            No imprimir
          </Button>
          <Button
            type="button"
            disabled={printing || loading || !printerName}
            onClick={() => void handlePrint()}
          >
            {printing ? 'Imprimiendo...' : 'Imprimir ticket'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[rgb(var(--text-muted))]">
          Venta <strong className="text-[rgb(var(--text))]">{ticketNumber}</strong> registrada.
          Revise la vista previa y elija la impresora.
        </p>

        <Select
          label="Impresora"
          value={printerName}
          onChange={setPrinterName}
          options={
            printerOptions.length
              ? printerOptions
              : [{ value: '', label: 'Sin impresoras detectadas' }]
          }
          placeholder="Seleccione impresora"
        />

        {loadError && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{loadError}</p>
        )}

        <div className="rounded-xl border border-dashed border-surface-border bg-white px-3 py-3 text-black shadow-inner">
          {loading || !detail ? (
            <p className="text-center text-sm text-neutral-500">
              {loading ? 'Cargando vista previa...' : 'Sin datos del ticket'}
            </p>
          ) : (
            <div
              className="mx-auto w-full font-mono text-[11px] leading-snug"
              style={{ maxWidth: previewMaxWidth }}
            >
              {logoUrl ? (
                <div className="mb-2 flex justify-center">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-auto object-contain"
                    style={{
                      width: `${Math.min(100, Math.max(40, ticketLogoWidthPercent || 65))}%`
                    }}
                  />
                </div>
              ) : null}
              <p className="text-center text-sm font-bold">{companyName || 'Punto de Venta'}</p>
              {companyAddress ? (
                <p className="mt-0.5 text-center text-[10px] text-neutral-600">{companyAddress}</p>
              ) : null}
              <hr className="my-2 border-neutral-400" />
              <TicketRow label="Ticket">{detail.ticketNumber}</TicketRow>
              <TicketRow label="Fecha">
                {detail.createdAt.replace('T', ' ').slice(0, 19)}
              </TicketRow>
              <hr className="my-2 border-neutral-400" />
              <ul className="space-y-1.5">
                {detail.items.map((item) => (
                  <li key={item.id}>
                    <p className="font-semibold">{item.productName}</p>
                    <div className="flex justify-between gap-2 text-neutral-700">
                      <span>
                        {item.quantity} × <MoneyDisplay amount={item.unitPrice} size="sm" />
                      </span>
                      <MoneyDisplay amount={item.lineTotal} size="sm" />
                    </div>
                  </li>
                ))}
              </ul>
              <hr className="my-2 border-neutral-400" />
              <TicketRow label="Subtotal">
                <MoneyDisplay amount={detail.subtotal} size="sm" />
              </TicketRow>
              {detail.discount > 0 && (
                <TicketRow label="Descuento">
                  <MoneyDisplay amount={detail.discount} size="sm" />
                </TicketRow>
              )}
              <TicketRow label="TOTAL" strong>
                <MoneyDisplay amount={detail.total} size="sm" />
              </TicketRow>
              <TicketRow label="Pagó">
                <MoneyDisplay amount={detail.amountPaid} size="sm" />
              </TicketRow>
              <TicketRow label="Vuelto">
                <MoneyDisplay amount={detail.changeAmount} size="sm" />
              </TicketRow>
              <hr className="my-2 border-neutral-400" />
              <p className="text-center">¡Gracias por su compra!</p>
              {ticketSlogan.trim() ? (
                <p className="mt-2 whitespace-pre-wrap text-center text-[10px] text-neutral-700">
                  {ticketSlogan.trim()}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
