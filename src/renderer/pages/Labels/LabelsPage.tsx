import { useEffect, useRef, useState } from 'react'
import type { Product } from '@shared/types/catalog'
import type { LabelPrintItem } from '@shared/types/labels'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { barcodeToBase64, renderBarcodeSvg } from '../../lib/barcode'

interface QueueItem extends LabelPrintItem {
  id: string
}

export function LabelsPage(): React.JSX.Element {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const [customName, setCustomName] = useState('')
  const [customBarcode, setCustomBarcode] = useState('')
  const [customPrice, setCustomPrice] = useState(0)
  const [copies, setCopies] = useState(1)

  const [printing, setPrinting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [barcodeExists, setBarcodeExists] = useState<boolean | null>(null)

  const previewRef = useRef<SVGSVGElement>(null)
  const previewCode = customBarcode.trim() || selectedProduct?.barcode || ''

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

  useEffect(() => {
    if (!previewRef.current || !previewCode) return
    try {
      renderBarcodeSvg(previewRef.current, previewCode)
    } catch {
      // código inválido para CODE128
    }
  }, [previewCode])

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

  function addToQueue(item: Omit<QueueItem, 'id'>): void {
    if (!item.barcode.trim()) {
      setError('El código de barras es obligatorio')
      return
    }
    setQueue((q) => [...q, { ...item, id: `${Date.now()}-${Math.random()}` }])
    setMessage(`Agregado: ${item.name}`)
    setError(null)
  }

  function addProductToQueue(p: Product, qty: number): void {
    if (!p.barcode) {
      setError('El producto no tiene código de barras')
      return
    }
    addToQueue({
      name: p.name,
      barcode: p.barcode,
      price: p.priceRetail,
      copies: qty
    })
  }

  function handleAddCustom(): void {
    addToQueue({
      name: customName.trim() || customBarcode.trim(),
      barcode: customBarcode.trim(),
      price: customPrice > 0 ? customPrice : null,
      copies
    })
  }

  async function handleGenerateBarcode(): Promise<void> {
    const res = await window.api.labels.generateBarcode()
    if (!res.ok) {
      setError(res.error)
      return
    }
    setCustomBarcode(res.data.barcode)
    setMessage('Código nuevo generado (único en el sistema)')
  }

  async function assignBarcodeToProduct(): Promise<void> {
    if (!selectedProduct || !customBarcode.trim()) return
    const res = await window.api.products.update(selectedProduct.id, {
      productCode: selectedProduct.productCode,
      name: selectedProduct.name,
      barcode: customBarcode.trim(),
      categoryId: selectedProduct.categoryId,
      stock: selectedProduct.stock,
      stockMin: selectedProduct.stockMin,
      brand: selectedProduct.brand,
      size: selectedProduct.size,
      color: selectedProduct.color,
      description: selectedProduct.description,
      costPrice: selectedProduct.costPrice,
      priceRetail: selectedProduct.priceRetail,
      priceWholesale: selectedProduct.priceWholesale,
      isActive: selectedProduct.isActive
    })
    if (!res.ok) {
      setError(res.error)
      return
    }
    setSelectedProduct(res.data)
    setMessage(`Código asignado a ${res.data.name}`)
  }

  async function handlePrint(): Promise<void> {
    if (queue.length === 0) {
      setError('La cola de impresión está vacía')
      return
    }
    setPrinting(true)
    setError(null)

    const uniqueCodes = [...new Set(queue.map((i) => i.barcode))]
    const barcodeImages: Record<string, string> = {}

    try {
      for (const code of uniqueCodes) {
        barcodeImages[code] = await barcodeToBase64(code)
      }
    } catch (e) {
      setPrinting(false)
      setError(e instanceof Error ? e.message : 'Error al generar códigos')
      return
    }

    const result = await window.api.labels.print({
      items: queue.map(({ name, barcode, price, copies: c }) => ({
        name,
        barcode,
        price,
        copies: c
      })),
      barcodeImages
    })

    setPrinting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage(`${result.data.printed} etiqueta(s) enviadas a la impresora`)
    setQueue([])
  }

  const totalLabels = queue.reduce((s, i) => s + i.copies, 0)

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Etiquetas</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Códigos de barras CODE128 · impresora de etiquetas en Configuración
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={queue.length === 0 || printing}
            onClick={() => setQueue([])}
          >
            Vaciar cola
          </Button>
          <Button disabled={queue.length === 0 || printing} onClick={() => void handlePrint()}>
            {printing ? 'Imprimiendo...' : `Imprimir (${totalLabels})`}
          </Button>
        </div>
      </header>

      {message && (
        <p className="mb-4 rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand">{message}</p>
      )}
      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cola */}
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
                      onClick={() => setQueue((q) => q.filter((x) => x.id !== item.id))}
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Productos del catálogo */}
        <section className="rounded-xl border border-surface-border bg-surface-elevated p-4 lg:col-span-1">
          <h3 className="mb-3 font-medium">Desde productos</h3>
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
                    'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface',
                    selectedProduct?.id === p.id ? 'bg-brand/10' : ''
                  ].join(' ')}
                  onClick={() => {
                    setSelectedProduct(p)
                    setCustomBarcode(p.barcode ?? '')
                    setCustomName(p.name)
                    setCustomPrice(p.priceRetail)
                  }}
                >
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="shrink-0 font-mono text-xs">{p.barcode}</span>
                </button>
              ))
            )}
          </div>
          {selectedProduct && (
            <div className="mt-3 space-y-2">
              <p className="text-sm">
                Seleccionado: <strong>{selectedProduct.name}</strong>
              </p>
              <div className="flex items-center gap-2">
                <Input
                  label="Copias"
                  type="number"
                  min={1}
                  max={500}
                  value={String(copies)}
                  onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
                />
                <Button
                  className="mt-6 shrink-0"
                  onClick={() => addProductToQueue(selectedProduct, copies)}
                >
                  + Cola
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Personalizado */}
        <section className="rounded-xl border border-surface-border bg-surface-elevated p-4 lg:col-span-1">
          <h3 className="mb-3 font-medium">Etiqueta personalizada</h3>
          <div className="space-y-3">
            <Input
              label="Nombre en etiqueta"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Opcional"
            />
            <div>
              <Input
                label="Código de barras"
                value={customBarcode}
                onChange={(e) => setCustomBarcode(e.target.value)}
                placeholder="Existente o nuevo"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => void handleGenerateBarcode()}>
                  Generar código nuevo
                </Button>
                {barcodeExists === true && (
                  <Badge variant="warning">Ya registrado</Badge>
                )}
                {barcodeExists === false && customBarcode && (
                  <Badge variant="success">Disponible</Badge>
                )}
              </div>
            </div>
            <MoneyInput
              label="Precio (opcional)"
              value={customPrice}
              onChange={setCustomPrice}
            />
            <Input
              label="Copias"
              type="number"
              min={1}
              max={500}
              value={String(copies)}
              onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleAddCustom}>
                Agregar a cola
              </Button>
              {selectedProduct && customBarcode && (
                <Button type="button" variant="secondary" onClick={() => void assignBarcodeToProduct()}>
                  Asignar al producto
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Vista previa */}
      <section className="mt-6 rounded-xl border border-surface-border bg-surface-elevated p-6">
        <h3 className="mb-4 font-medium">Vista previa</h3>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-border bg-white p-6 dark:bg-slate-900">
          {previewCode ? (
            <svg ref={previewRef} className="max-w-full" />
          ) : (
            <p className="text-sm text-[rgb(var(--text-muted))]">
              Ingrese o genere un código para previsualizar
            </p>
          )}
        </div>
        {previewCode && (
          <p className="mt-2 text-center font-mono text-sm text-[rgb(var(--text-muted))]">
            {previewCode}
          </p>
        )}
      </section>
    </div>
  )
}
