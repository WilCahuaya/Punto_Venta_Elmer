import { useEffect, useMemo, useState } from 'react'
import type { Product } from '@shared/types/catalog'
import type { LabelPrintItem, LabelPrintMode, LabelPrintPayload } from '@shared/types/labels'
import type { PrinterInfo } from '@shared/types/settings'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { NumberInput } from '../../components/ui/NumberInput'
import { Select } from '../../components/ui/Select'
import { barcodeToBase64, LABEL_BARCODE_OPTIONS } from '../../lib/barcode'
import { formatMoney } from '@shared/lib/currency'
import { buildSingleLabelDocumentHtml } from '@shared/lib/label-html'
import {
  A4_LABEL_PRESETS,
  a4SheetsNeeded,
  computeA4LabelGrid,
  isCompactLabel,
  resolveLabelDimensions
} from '@shared/lib/thermal-print'
import { useLabelQueueStore } from '../../stores/label-queue.store'
import { useSettingsStore } from '../../stores/settings.store'

function EyeIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** Nombre + marca + talla + color (si existen). */
function formatProductLabelSummary(p: Product): string {
  const parts = [p.name, p.brand, p.size, p.color]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v))
  return parts.join(' · ')
}

function resolvePrintProductName(p: Product, consolidated: boolean): string {
  return consolidated ? formatProductLabelSummary(p) : p.name
}

export function LabelsPage(): React.JSX.Element {
  const currencySymbol = useSettingsStore((s) => s.currencySymbol)
  const labelPreset = useSettingsStore((s) => s.labelPreset)
  const labelWidthMm = useSettingsStore((s) => s.labelWidthMm)
  const labelHeightMm = useSettingsStore((s) => s.labelHeightMm)
  const labelDpi = useSettingsStore((s) => s.labelDpi)
  const printerLabels = useSettingsStore((s) => s.printerLabels)
  const rollDims = resolveLabelDimensions({
    presetId: labelPreset,
    widthMm: labelWidthMm,
    heightMm: labelHeightMm,
    dpi: labelDpi
  })

  const queue = useLabelQueueStore((s) => s.queue)
  const addQueueItem = useLabelQueueStore((s) => s.addItem)
  const removeQueueItem = useLabelQueueStore((s) => s.removeItem)
  const clearQueue = useLabelQueueStore((s) => s.clear)

  const [printMode, setPrintMode] = useState<LabelPrintMode>('roll')
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const [customName, setCustomName] = useState('')
  const [customBarcode, setCustomBarcode] = useState('')
  const [customPrice, setCustomPrice] = useState(0)
  const [copies, setCopies] = useState(1)
  const [useConsolidatedName, setUseConsolidatedName] = useState(false)

  const [printing, setPrinting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [barcodeExists, setBarcodeExists] = useState<boolean | null>(null)

  const [a4ModalOpen, setA4ModalOpen] = useState(false)
  const [a4PresetId, setA4PresetId] = useState(A4_LABEL_PRESETS[0]?.id ?? '50x25')
  const [a4WidthMm, setA4WidthMm] = useState(50)
  const [a4HeightMm, setA4HeightMm] = useState(25)
  const [a4Printer, setA4Printer] = useState('')
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [loadingPrinters, setLoadingPrinters] = useState(false)

  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [pdfPreviewMeta, setPdfPreviewMeta] = useState<string>('')
  const [previewing, setPreviewing] = useState(false)
  const [livePreviewHtml, setLivePreviewHtml] = useState('')

  const previewCode = customBarcode.trim() || selectedProduct?.barcode || ''

  const a4Dims = useMemo(
    () =>
      resolveLabelDimensions({
        presetId: a4PresetId,
        widthMm: a4WidthMm,
        heightMm: a4HeightMm,
        dpi: 300
      }),
    [a4PresetId, a4HeightMm, a4WidthMm]
  )
  const a4Grid = useMemo(
    () => computeA4LabelGrid(a4Dims.widthMm, a4Dims.heightMm),
    [a4Dims.heightMm, a4Dims.widthMm]
  )

  const activeDims = printMode === 'a4' ? a4Dims : rollDims
  const compactPreview = isCompactLabel(activeDims.widthMm, activeDims.heightMm)
  const previewMaxWidthPx = compactPreview ? 220 : 280
  const previewWidthPx = previewMaxWidthPx
  const previewHeightPx = Math.max(
    compactPreview ? 36 : 48,
    Math.round((previewMaxWidthPx * activeDims.heightMm) / activeDims.widthMm)
  )
  /** Tamaño CSS en px del HTML de etiqueta (96 dpi ≈ impresión Chromium). */
  const labelNaturalPx = useMemo(() => {
    const mmToPx = (mm: number) => (mm * 96) / 25.4
    return {
      w: mmToPx(activeDims.widthMm),
      h: mmToPx(activeDims.heightMm)
    }
  }, [activeDims.heightMm, activeDims.widthMm])
  const previewScale = Math.min(
    previewWidthPx / labelNaturalPx.w,
    previewHeightPx / labelNaturalPx.h
  )

  useEffect(() => {
    if (!search.trim()) {
      setProducts([])
      return
    }
    const t = setTimeout(async () => {
      const res = await window.api.products.list({ search, includeInactive: false })
      if (res.ok) setProducts(res.data.filter((p) => p.barcode))
    }, 150)
    return () => clearTimeout(t)
  }, [search])

  const previewName = customName.trim() || selectedProduct?.name || 'Producto'
  const previewPrice =
    customPrice > 0
      ? customPrice
      : selectedProduct?.priceRetail && selectedProduct.priceRetail > 0
        ? selectedProduct.priceRetail
        : null

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      void (async () => {
        if (!previewCode) {
          if (!cancelled) {
            setLivePreviewHtml(
              buildSingleLabelDocumentHtml(
                {
                  productName: previewName,
                  priceText:
                    previewPrice != null && previewPrice > 0
                      ? formatMoney(previewPrice, currencySymbol)
                      : null,
                  barcodeCode: '',
                  barcodeSrc: ''
                },
                activeDims
              )
            )
          }
          return
        }
        try {
          const b64 = await barcodeToBase64(previewCode, LABEL_BARCODE_OPTIONS)
          if (cancelled) return
          setLivePreviewHtml(
            buildSingleLabelDocumentHtml(
              {
                productName: previewName,
                priceText:
                  previewPrice != null && previewPrice > 0
                    ? formatMoney(previewPrice, currencySymbol)
                    : null,
                barcodeCode: previewCode,
                barcodeSrc: `data:image/png;base64,${b64}`
              },
              activeDims
            )
          )
        } catch {
          if (!cancelled) setLivePreviewHtml('')
        }
      })()
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [
    previewCode,
    previewName,
    previewPrice,
    activeDims.widthMm,
    activeDims.heightMm,
    activeDims.dpi,
    currencySymbol
  ])

  useEffect(() => {
    if (!customBarcode.trim()) {
      setBarcodeExists(null)
      return
    }
    const t = setTimeout(async () => {
      const res = await window.api.labels.checkBarcode(customBarcode.trim())
      if (res.ok) setBarcodeExists(res.data.exists)
    }, 300)
    return () => clearTimeout(t)
  }, [customBarcode])

  function addToQueue(item: LabelPrintItem): void {
    if (!item.barcode.trim()) {
      setError('El código de barras es obligatorio')
      return
    }
    addQueueItem(item)
    setMessage(`Agregado: ${item.name}`)
    setError(null)
  }

  function handleAddToQueue(): void {
    const barcode = customBarcode.trim()
    if (!barcode) {
      setError('El código de barras es obligatorio')
      return
    }
    addToQueue({
      name: customName.trim() || selectedProduct?.name || barcode,
      barcode,
      price: customPrice > 0 ? customPrice : null,
      copies
    })
  }

  async function loadPrintersForA4(): Promise<void> {
    setLoadingPrinters(true)
    const result = await window.api.settings.listPrinters()
    setLoadingPrinters(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPrinters(result.data)
    const preferred =
      result.data.find((p) => /pdf/i.test(p.name) || /pdf/i.test(p.displayName))?.name ??
      result.data.find((p) => p.name === printerLabels)?.name ??
      result.data.find((p) => p.isDefault)?.name ??
      result.data[0]?.name ??
      ''
    setA4Printer((prev) => prev || preferred)
  }

  async function openA4Modal(): Promise<void> {
    if (queue.length === 0) {
      setError('La cola de impresión está vacía')
      return
    }
    setError(null)
    setA4ModalOpen(true)
    await loadPrintersForA4()
  }

  async function buildBarcodeImages(): Promise<Record<string, string>> {
    const uniqueCodes = [...new Set(queue.map((i) => i.barcode))]
    const barcodeImages: Record<string, string> = {}
    for (const code of uniqueCodes) {
      barcodeImages[code] = await barcodeToBase64(code, LABEL_BARCODE_OPTIONS)
    }
    return barcodeImages
  }

  function buildPrintPayload(barcodeImages: Record<string, string>): LabelPrintPayload {
    const items = queue.map(({ name, barcode, price, copies: c }) => ({
      name,
      barcode,
      price,
      copies: c
    }))
    if (printMode === 'a4') {
      return {
        mode: 'a4',
        items,
        barcodeImages,
        a4: {
          presetId: a4PresetId,
          widthMm: a4Dims.widthMm,
          heightMm: a4Dims.heightMm,
          printerName: a4Printer
        }
      }
    }
    return { mode: 'roll', items, barcodeImages }
  }

  function closePdfPreview(): void {
    setPdfPreviewOpen(false)
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl)
      setPdfPreviewUrl(null)
    }
    setPdfPreviewMeta('')
  }

  async function handlePreviewPdf(): Promise<void> {
    if (queue.length === 0) {
      setError('La cola de impresión está vacía')
      return
    }
    setPreviewing(true)
    setError(null)
    try {
      const barcodeImages = await buildBarcodeImages()
      const result = await window.api.labels.previewPdf(buildPrintPayload(barcodeImages))
      if (!result.ok) {
        setError(result.error)
        return
      }
      const binary = atob(result.data.pdfBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
      const url = URL.createObjectURL(blob)
      setPdfPreviewUrl(url)
      const sheetsTxt =
        result.data.mode === 'a4' && result.data.sheets
          ? ` · ${result.data.sheets} hoja(s) A4`
          : ''
      setPdfPreviewMeta(
        `${result.data.labelCount} etiqueta(s) · ${result.data.widthMm}×${result.data.heightMm} mm${sheetsTxt}`
      )
      setPdfPreviewOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar vista previa')
    } finally {
      setPreviewing(false)
    }
  }

  async function handlePrintRoll(): Promise<void> {
    if (queue.length === 0) {
      setError('La cola de impresión está vacía')
      return
    }
    setPrinting(true)
    setError(null)

    try {
      const barcodeImages = await buildBarcodeImages()
      const result = await window.api.labels.print(buildPrintPayload(barcodeImages))
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessage(
        `${result.data.printed} etiqueta(s) en rollo (${rollDims.widthMm}×${rollDims.heightMm} mm)`
      )
      clearQueue()
      closePdfPreview()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar códigos')
    } finally {
      setPrinting(false)
    }
  }

  async function handlePrintA4(): Promise<void> {
    if (!a4Printer.trim()) {
      setError('Seleccione una impresora')
      return
    }
    setPrinting(true)
    setError(null)

    try {
      const barcodeImages = await buildBarcodeImages()
      const result = await window.api.labels.print(buildPrintPayload(barcodeImages))
      if (!result.ok) {
        setError(result.error)
        return
      }
      const sheets = result.data.sheets ?? a4SheetsNeeded(result.data.printed, a4Grid.perSheet)
      setMessage(
        `${result.data.printed} etiqueta(s) en ${sheets} hoja(s) A4 (${a4Dims.widthMm}×${a4Dims.heightMm} mm)`
      )
      clearQueue()
      setA4ModalOpen(false)
      closePdfPreview()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar códigos')
    } finally {
      setPrinting(false)
    }
  }

  function handlePrintClick(): void {
    if (printMode === 'a4') void openA4Modal()
    else void handlePrintRoll()
  }

  function handlePrintFromPreview(): void {
    if (printMode === 'a4') {
      closePdfPreview()
      void openA4Modal()
      return
    }
    void handlePrintRoll()
  }

  const totalLabels = queue.reduce((s, i) => s + i.copies, 0)
  const a4SheetsPreview = a4SheetsNeeded(totalLabels, a4Grid.perSheet)
  const printerOptions = [
    ...printers.map((p) => ({
      value: p.name,
      label: p.isDefault ? `${p.displayName} (predeterminada)` : p.displayName
    }))
  ]

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Etiquetas</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            {printMode === 'a4'
              ? `Hoja A4 · etiquetas ${a4Dims.widthMm} × ${a4Dims.heightMm} mm`
              : `Rollo térmico · ${rollDims.widthMm} × ${rollDims.heightMm} mm · CODE128`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-surface-border p-0.5">
            <button
              type="button"
              className={[
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                printMode === 'roll'
                  ? 'bg-brand/15 font-medium text-brand ring-1 ring-brand/40'
                  : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]'
              ].join(' ')}
              onClick={() => setPrintMode('roll')}
            >
              Rollo térmico
            </button>
            <button
              type="button"
              className={[
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                printMode === 'a4'
                  ? 'bg-brand/15 font-medium text-brand ring-1 ring-brand/40'
                  : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]'
              ].join(' ')}
              onClick={() => setPrintMode('a4')}
            >
              Hoja A4
            </button>
          </div>
          <Button
            variant="secondary"
            disabled={queue.length === 0 || printing}
            onClick={() => clearQueue()}
          >
            Vaciar cola
          </Button>
          <Button
            variant="secondary"
            disabled={queue.length === 0 || printing || previewing}
            onClick={() => void handlePreviewPdf()}
            title="Previsualizar PDF"
            aria-label="Previsualizar PDF"
          >
            <EyeIcon />
            {previewing ? 'Generando...' : 'Vista previa'}
          </Button>
          <Button disabled={queue.length === 0 || printing} onClick={handlePrintClick}>
            {printing
              ? 'Imprimiendo...'
              : printMode === 'a4'
                ? `Imprimir A4 (${totalLabels})`
                : `Imprimir (${totalLabels})`}
          </Button>
        </div>
      </header>

      <p className="mb-4 text-xs text-[rgb(var(--text-muted))]">
        {printMode === 'a4'
          ? 'En A4 use Vista previa (ojito) para ver el PDF; al imprimir elegirá impresora y la hoja se distribuirá automáticamente.'
          : 'Use Vista previa (ojito) para ver el PDF antes de imprimir. El rollo usa tamaño e impresora de Configuración.'}
      </p>

      {message && (
        <p className="mb-4 rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand">{message}</p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-surface-border bg-surface-elevated p-4 lg:col-span-1">
          <h3 className="mb-3 font-medium">Cola de impresión ({totalLabels})</h3>
          {queue.length === 0 ? (
            <p className="text-sm text-[rgb(var(--text-muted))]">Sin etiquetas en cola</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {queue.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-surface-border/60 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="font-mono text-xs text-[rgb(var(--text-muted))]">{item.barcode}</p>
                    {item.price != null && item.price > 0 && (
                      <MoneyDisplay amount={item.price} size="sm" />
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="muted">×{item.copies}</Badge>
                    <button
                      type="button"
                      className="text-xs text-red-500"
                      onClick={() => removeQueueItem(item.id)}
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-surface-border bg-surface-elevated p-4 lg:col-span-1">
          <h3 className="mb-1 font-medium">1. Elegir producto</h3>
          <p className="mb-3 text-xs text-[rgb(var(--text-muted))]">
            Busque y seleccione; los datos pasan a la derecha.
          </p>
          <Input
            label="Buscar producto"
            placeholder="Nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-surface-border">
            {products.length === 0 ? (
              <p className="p-3 text-xs text-[rgb(var(--text-muted))]">
                {search ? 'Sin resultados con código' : 'Busque un producto'}
              </p>
            ) : (
              products.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={[
                    'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface',
                    selectedProduct?.id === p.id ? 'bg-brand/10' : ''
                  ].join(' ')}
                  onClick={() => {
                    setSelectedProduct(p)
                    setCustomBarcode(p.barcode ?? '')
                    setCustomName(resolvePrintProductName(p, useConsolidatedName))
                    setCustomPrice(p.priceRetail)
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{formatProductLabelSummary(p)}</span>
                    {p.categoryName ? (
                      <span className="block truncate text-xs text-[rgb(var(--text-muted))]">
                        {p.categoryName}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-mono text-xs">{p.barcode}</span>
                </button>
              ))
            )}
          </div>
          {selectedProduct && (
            <div className="mt-3 rounded-lg border border-surface-border/60 bg-surface px-3 py-2 text-sm">
              <p className="text-xs text-[rgb(var(--text-muted))]">Producto seleccionado</p>
              <p className="font-medium leading-snug">
                {formatProductLabelSummary(selectedProduct)}
              </p>
              <p className="mt-0.5 font-mono text-xs text-[rgb(var(--text-muted))]">
                {selectedProduct.barcode}
                {selectedProduct.categoryName ? ` · ${selectedProduct.categoryName}` : ''}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-surface-border bg-surface-elevated p-4 lg:col-span-1">
          <h3 className="mb-1 font-medium">2. Datos de la etiqueta</h3>
          <p className="mb-3 text-xs text-[rgb(var(--text-muted))]">
            Revise o edite y agregue a la cola.
          </p>
          <div className="space-y-3">
            <Input
              label="Nombre en etiqueta"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nombre a imprimir"
            />
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={useConsolidatedName}
                disabled={!selectedProduct}
                onChange={(e) => {
                  const next = e.target.checked
                  setUseConsolidatedName(next)
                  if (selectedProduct) {
                    setCustomName(resolvePrintProductName(selectedProduct, next))
                  }
                }}
              />
              <span>
                <span className="font-medium">Nombre consolidado en impresión</span>
                <span className="mt-0.5 block text-xs text-[rgb(var(--text-muted))]">
                  Incluye marca, talla y color (si existen) en el texto de la etiqueta.
                </span>
              </span>
            </label>
            <div>
              <Input
                label="Código de barras"
                value={customBarcode}
                onChange={(e) => setCustomBarcode(e.target.value)}
                placeholder="Código del producto"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {barcodeExists === true && <Badge variant="warning">Ya registrado</Badge>}
                {barcodeExists === false && customBarcode && (
                  <Badge variant="success">Disponible</Badge>
                )}
              </div>
            </div>
            <MoneyInput label="Precio (opcional)" value={customPrice} onChange={setCustomPrice} />
            <NumberInput
              label="Copias"
              min={1}
              max={500}
              emptyValue={1}
              value={copies}
              onChange={setCopies}
            />
            <Button type="button" onClick={handleAddToQueue}>
              Agregar a cola
            </Button>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-surface-border bg-surface-elevated p-6">
        <h3 className="mb-1 font-medium">
          Vista previa — {activeDims.widthMm} × {activeDims.heightMm} mm
        </h3>
        <p className="mb-4 text-xs text-[rgb(var(--text-muted))]">
          Misma maquetación que al imprimir (HTML compartido), escalada a esta vista.
        </p>
        <div className="flex justify-center">
          <div
            className="relative overflow-hidden rounded border border-surface-border bg-white shadow-sm"
            style={{ width: previewWidthPx, height: previewHeightPx }}
          >
            {livePreviewHtml ? (
              <div
                className="overflow-hidden"
                style={{
                  width: labelNaturalPx.w * previewScale,
                  height: labelNaturalPx.h * previewScale
                }}
              >
                <div
                  style={{
                    width: labelNaturalPx.w,
                    height: labelNaturalPx.h,
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left'
                  }}
                >
                  <iframe
                    title="Vista previa de etiqueta"
                    srcDoc={livePreviewHtml}
                    scrolling="no"
                    className="pointer-events-none block border-0 bg-white"
                    style={{
                      width: labelNaturalPx.w,
                      height: labelNaturalPx.h,
                      overflow: 'hidden'
                    }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            ) : (
              <p className="flex h-full items-center justify-center text-xs text-[rgb(var(--text-muted))]">
                Sin vista previa
              </p>
            )}
          </div>
        </div>
      </section>

      {a4ModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md rounded-xl border border-surface-border bg-surface-elevated p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="a4-print-title"
          >
            <h3 id="a4-print-title" className="mb-4 text-lg font-semibold">
              Imprimir en hoja A4
            </h3>
            <div className="space-y-4">
              <Select
                label="Tamaño de etiqueta en la hoja"
                value={a4PresetId}
                onChange={setA4PresetId}
                options={A4_LABEL_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
              />
              {a4PresetId === 'custom' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberInput
                    label="Ancho (mm)"
                    min={15}
                    max={120}
                    emptyValue={50}
                    value={a4WidthMm}
                    onChange={setA4WidthMm}
                  />
                  <NumberInput
                    label="Alto (mm)"
                    min={8}
                    max={80}
                    emptyValue={25}
                    value={a4HeightMm}
                    onChange={setA4HeightMm}
                  />
                </div>
              )}
              <div className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
                En cada hoja A4 caben {a4Grid.cols} × {a4Grid.rows} = {a4Grid.perSheet} etiquetas de{' '}
                {a4Dims.widthMm} × {a4Dims.heightMm} mm. Se imprimirán unas {a4SheetsPreview} hoja(s)
                (distribución automática).
              </div>
              <Select
                label="Impresora"
                value={a4Printer}
                onChange={setA4Printer}
                options={
                  printerOptions.length > 0
                    ? printerOptions
                    : [{ value: '', label: loadingPrinters ? 'Cargando...' : 'Sin impresoras' }]
                }
              />
              <p className="text-xs text-[rgb(var(--text-muted))]">
                Para A4 use una impresora láser o de inyección de tinta (o «Microsoft Print to PDF»).
                No use la térmica de rollo.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={printing || previewing}
                onClick={() => setA4ModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={printing || previewing || queue.length === 0}
                onClick={() => void handlePreviewPdf()}
                title="Previsualizar PDF"
                aria-label="Previsualizar PDF"
              >
                <EyeIcon />
                {previewing ? 'Generando...' : 'Vista previa'}
              </Button>
              <Button
                type="button"
                disabled={printing || !a4Printer}
                onClick={() => void handlePrintA4()}
              >
                {printing ? 'Imprimiendo...' : 'Imprimir'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={pdfPreviewOpen}
        title="Vista previa PDF"
        onClose={closePdfPreview}
        size="xl"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closePdfPreview}>
              Cerrar
            </Button>
            <Button
              type="button"
              disabled={printing}
              onClick={handlePrintFromPreview}
            >
              {printMode === 'a4' ? 'Continuar a imprimir' : printing ? 'Imprimiendo...' : 'Imprimir'}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-[rgb(var(--text-muted))]">{pdfPreviewMeta}</p>
        {pdfPreviewUrl ? (
          <iframe
            title="Vista previa de etiquetas PDF"
            src={pdfPreviewUrl}
            className="h-[70vh] w-full rounded-lg border border-surface-border bg-white"
          />
        ) : (
          <p className="text-sm text-[rgb(var(--text-muted))]">Sin documento</p>
        )}
      </Modal>
    </div>
  )
}
