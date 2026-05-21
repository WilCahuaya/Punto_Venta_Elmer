import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '@shared/types/catalog'
import { productToPosProduct } from '@shared/types/sales'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { PaymentModal } from '../../features/pos/PaymentModal'
import { QuantityModal } from '../../features/pos/QuantityModal'
import { playErrorSound, playScanSound, playSuccessSound } from '../../lib/sounds'
import { usePosStore } from '../../stores/pos.store'
import { useCashStore } from '../../stores/cash.store'
import { useSettingsStore } from '../../stores/settings.store'

export function PosPage(): React.JSX.Element {
  const isOpen = useCashStore((s) => s.isOpen)
  const cashLoading = useCashStore((s) => s.loading)
  const refreshCash = useCashStore((s) => s.refresh)
  const soundsEnabled = useSettingsStore((s) => s.soundsEnabled)

  const lines = usePosStore((s) => s.lines)
  const discount = usePosStore((s) => s.discount)
  const addProduct = usePosStore((s) => s.addProduct)
  const updateQuantity = usePosStore((s) => s.updateQuantity)
  const removeLine = usePosStore((s) => s.removeLine)
  const clearCart = usePosStore((s) => s.clearCart)
  const getSubtotal = usePosStore((s) => s.getSubtotal)
  const getTotal = usePosStore((s) => s.getTotal)
  const toSaleItems = usePosStore((s) => s.toSaleItems)

  const barcodeRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [barcodeBuffer, setBarcodeBuffer] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [qtyProduct, setQtyProduct] = useState<ReturnType<typeof productToPosProduct> | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const subtotal = getSubtotal()
  const total = getTotal()

  const focusBarcode = useCallback(() => {
    barcodeRef.current?.focus()
  }, [])

  useEffect(() => {
    if (isOpen) focusBarcode()
  }, [isOpen, focusBarcode, qtyProduct, paymentOpen])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const t = setTimeout(async () => {
      setSearching(true)
      const res = await window.api.sales.searchProducts(searchQuery)
      if (res.ok) setSearchResults(res.data)
      setSearching(false)
    }, 150)
    return () => clearTimeout(t)
  }, [searchQuery])

  async function resolveProduct(
    source: 'barcode' | 'search',
    codeOrId: string
  ): Promise<void> {
    setStatusMsg(null)
    let product: Product | null = null

    if (source === 'barcode') {
      const res = await window.api.sales.lookupBarcode(codeOrId)
      if (!res.ok) {
        setStatusMsg(res.error)
        if (soundsEnabled) playErrorSound()
        return
      }
      product = res.data
    } else {
      const found = searchResults.find((p) => String(p.id) === codeOrId)
      if (found) product = found
    }

    if (!product) return
    if (product.stock <= 0) {
      setStatusMsg(`Sin stock: ${product.name}`)
      if (soundsEnabled) playErrorSound()
      return
    }

    if (soundsEnabled) playScanSound()
    setQtyProduct(productToPosProduct(product))
  }

  function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      const code = barcodeBuffer.trim()
      if (code) void resolveProduct('barcode', code)
      setBarcodeBuffer('')
    }
  }

  function handleConfirmQty(quantity: number, unitPrice: number, priceLabel: string): void {
    if (!qtyProduct) return
    addProduct(
      {
        id: qtyProduct.id,
        name: qtyProduct.name,
        barcode: qtyProduct.barcode,
        stock: qtyProduct.stock,
        costPrice: qtyProduct.costPrice
      },
      quantity,
      unitPrice,
      priceLabel
    )
    setQtyProduct(null)
    focusBarcode()
  }

  async function handlePayment(amountPaid: number): Promise<void> {
    const result = await window.api.sales.create({
      items: toSaleItems(),
      amountPaid,
      discount
    })

    if (!result.ok) {
      setStatusMsg(result.error)
      if (soundsEnabled) playErrorSound()
      return
    }

    if (soundsEnabled) playSuccessSound()

    const printRes = await window.api.sales.printTicket(result.data.id)
    if (!printRes.ok) {
      setStatusMsg(`Venta OK · Impresión: ${printRes.error}`)
    } else {
      setStatusMsg(`Venta ${result.data.ticketNumber} registrada`)
    }

    clearCart()
    setPaymentOpen(false)
    void refreshCash()
    focusBarcode()
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'F2') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'F4') {
        e.preventDefault()
        if (lines.length && confirm('¿Vaciar carrito?')) clearCart()
      }
      if (e.key === 'F12') {
        e.preventDefault()
        if (lines.length) setPaymentOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lines.length, clearCart])

  if (cashLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[rgb(var(--text-muted))]">
        Verificando caja...
      </div>
    )
  }

  if (!isOpen) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-8 text-center">
        <h2 className="text-xl font-semibold">Caja cerrada</h2>
        <p className="mt-2 max-w-md text-sm text-[rgb(var(--text-muted))]">
          Abra la caja para vender.
        </p>
        <Link to="/cash" className="mt-6">
          <Button>Ir a Caja</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[280px] flex-1">
          <input
            ref={barcodeRef}
            type="text"
            value={barcodeBuffer}
            onChange={(e) => setBarcodeBuffer(e.target.value)}
            onKeyDown={handleBarcodeKeyDown}
            placeholder="Escanee el código de barras aquí"
            autoComplete="off"
            className="w-full rounded-lg border-2 border-brand/40 bg-surface-elevated px-4 py-2.5 font-mono text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        {statusMsg && (
          <span className="ml-auto text-sm text-brand">{statusMsg}</span>
        )}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <Input
            ref={searchRef}
            label="Búsqueda manual"
            placeholder="Nombre o código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && searchResults[0]) {
                e.preventDefault()
                void resolveProduct('search', String(searchResults[0].id))
              }
            }}
          />
          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-surface-border">
            {searching ? (
              <p className="p-4 text-sm text-[rgb(var(--text-muted))]">Buscando...</p>
            ) : searchResults.length === 0 ? (
              <p className="p-4 text-sm text-[rgb(var(--text-muted))]">
                {searchQuery ? 'Sin resultados' : 'Escriba para buscar o use el escáner'}
              </p>
            ) : (
              <ul>
                {searchResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 border-b border-surface-border/50 px-3 py-2.5 text-left text-sm hover:bg-surface-elevated"
                      onClick={() => void resolveProduct('search', String(p.id))}
                    >
                      <span>
                        <span className="font-medium">{p.name}</span>
                        {p.barcode && (
                          <span className="ml-2 font-mono text-xs text-[rgb(var(--text-muted))]">
                            {p.barcode}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs">
                        Stock {p.stock} · <MoneyDisplay amount={p.priceRetail} size="sm" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Carrito ({lines.length})</h3>
            {lines.length > 0 && (
              <Button variant="ghost" type="button" onClick={() => clearCart()}>
                Vaciar
              </Button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-surface-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-surface-border bg-surface-elevated">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Producto</th>
                  <th className="px-3 py-2 text-center font-medium w-24">Cant.</th>
                  <th className="px-3 py-2 text-right font-medium">P.unit</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-[rgb(var(--text-muted))]"
                    >
                      Escanee o busque un producto
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr key={line.key} className="border-b border-surface-border/50">
                      <td className="px-3 py-2">
                        <div className="font-medium">{line.name}</div>
                        <div className="text-xs text-[rgb(var(--text-muted))]">
                          {line.priceLabel}
                          {line.barcode && (
                            <span className="ml-2 font-mono">{line.barcode}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          max={line.maxStock}
                          value={line.quantity}
                          onChange={(e) =>
                            updateQuantity(line.key, Number(e.target.value))
                          }
                          className="w-full rounded border border-surface-border bg-surface px-2 py-1 text-center tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <MoneyDisplay amount={line.unitPrice} size="sm" />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        <MoneyDisplay amount={line.lineTotal} size="sm" />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="text-[rgb(var(--text-muted))] hover:text-red-500"
                          onClick={() => removeLine(line.key)}
                          aria-label="Quitar"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-surface-border pt-4">
            <div className="space-y-1">
              <div className="flex gap-6 text-sm">
                <span className="text-[rgb(var(--text-muted))]">Subtotal</span>
                <MoneyDisplay amount={subtotal} />
              </div>
              {discount > 0 && (
                <div className="flex gap-6 text-sm text-amber-600">
                  <span>Descuento</span>
                  <MoneyDisplay amount={discount} size="sm" />
                </div>
              )}
              <div className="flex gap-6 text-xl font-bold">
                <span>TOTAL</span>
                <MoneyDisplay amount={total} size="lg" />
              </div>
            </div>
            <Button
              disabled={lines.length === 0}
              onClick={() => setPaymentOpen(true)}
              className="min-w-[160px] px-8 py-3 text-base"
            >
              Cobrar
            </Button>
          </div>
        </div>
      </div>

      <QuantityModal
        open={!!qtyProduct}
        product={qtyProduct}
        onClose={() => {
          setQtyProduct(null)
          focusBarcode()
        }}
        onConfirm={handleConfirmQty}
      />

      <PaymentModal
        open={paymentOpen}
        subtotal={subtotal}
        discount={discount}
        total={total}
        onClose={() => setPaymentOpen(false)}
        onConfirm={handlePayment}
      />
    </div>
  )
}
