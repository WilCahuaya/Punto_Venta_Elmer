import { FormEvent, useEffect, useState } from 'react'
import type { Category, Product, ProductInput } from '@shared/types/catalog'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { Select } from '../../components/ui/Select'
import { useProductImage } from '../../hooks/useProductImage'
import { buildCategorySelectOptions } from '../../lib/category-options'

interface ProductFormModalProps {
  open: boolean
  product: Product | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

function defaultForm(): ProductInput {
  return {
    name: '',
    barcode: '',
    categoryId: null,
    stock: 0,
    stockMin: 0,
    brand: '',
    size: '',
    color: '',
    description: '',
    costPrice: 0,
    priceRetail: 0,
    priceWholesale: null,
    isActive: true
  }
}

function FormSection({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="rounded-xl border border-surface-border p-4">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function ProductFormModal({
  open,
  product,
  categories,
  onClose,
  onSaved
}: ProductFormModalProps): React.JSX.Element {
  const [form, setForm] = useState<ProductInput>(defaultForm())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingImagePath, setPendingImagePath] = useState<string | null>(null)
  const [previewLocalUrl, setPreviewLocalUrl] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [barcodeAuto, setBarcodeAuto] = useState(false)

  const storedImageUrl = useProductImage(product?.imagePath)

  useEffect(() => {
    if (!open) return
    if (product) {
      setForm({
        productCode: product.productCode ?? '',
        name: product.name,
        barcode: product.barcode ?? '',
        categoryId: product.categoryId,
        stock: product.stock,
        stockMin: product.stockMin,
        brand: product.brand ?? '',
        size: product.size ?? '',
        color: product.color ?? '',
        description: product.description ?? '',
        costPrice: product.costPrice,
        priceRetail: product.priceRetail,
        priceWholesale: product.priceWholesale,
        isActive: product.isActive
      })
      setBarcodeAuto(false)
    } else {
      setForm(defaultForm())
      setBarcodeAuto(true)
      void window.api.labels.generateBarcode().then((res) => {
        if (res.ok) {
          setForm((f) => ({ ...f, barcode: res.data.barcode }))
        }
      })
    }
    setPendingImagePath(null)
    setPreviewLocalUrl(null)
    setRemoveImage(false)
    setError(null)
  }, [open, product])

  async function handlePickImage(): Promise<void> {
    const result = await window.api.products.pickImage()
    if (!result.ok || !result.data) return
    setPendingImagePath(result.data)
    setRemoveImage(false)
    setPreviewLocalUrl(`pos-media://img/${encodeURIComponent(result.data)}`)
  }

  const displayImage = removeImage ? null : previewLocalUrl ?? storedImageUrl

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload: ProductInput = {
      ...form,
      productCode: form.productCode?.trim() || null,
      barcode: form.barcode?.trim() || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      brand: form.brand || null,
      size: form.size || null,
      color: form.color || null,
      description: form.description || null,
      priceWholesale:
        form.priceWholesale != null && form.priceWholesale > 0 ? form.priceWholesale : null,
      pendingImagePath,
      removeImage,
      skipAutoBarcode: !barcodeAuto && !!form.barcode?.trim()
    }

    const result = product
      ? await window.api.products.update(product.id, payload)
      : await window.api.products.create(payload)

    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSaved()
    onClose()
  }

  const categoryOptions = buildCategorySelectOptions(categories)

  return (
    <Modal
      open={open}
      title={product ? 'Editar producto' : 'Nuevo producto'}
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="product-form" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <FormSection title="Información básica">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Código"
              value={form.productCode ?? ''}
              onChange={(e) => setForm({ ...form, productCode: e.target.value })}
              placeholder="Se genera automáticamente si está vacío"
            />
            <div>
              <Input
                label="Código de barras"
                value={form.barcode ?? ''}
                onChange={(e) => {
                  setBarcodeAuto(false)
                  setForm({ ...form, barcode: e.target.value })
                }}
              />
              {!product && barcodeAuto && (
                <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                  Generado automáticamente al crear
                </p>
              )}
            </div>
          </div>
          <Input
            label="Nombre del producto"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />
          <Select
            label="Categoría"
            value={form.categoryId ? String(form.categoryId) : ''}
            onChange={(v) => setForm({ ...form, categoryId: v ? Number(v) : null })}
            options={categoryOptions}
            placeholder="Sin categoría"
          />
        </FormSection>

        <FormSection title="Venta">
          <div className="grid gap-4 md:grid-cols-3">
            <MoneyInput
              label="Precio normal"
              value={form.priceRetail}
              onChange={(v) => setForm({ ...form, priceRetail: v })}
              required
            />
            <MoneyInput
              label="Precio por mayor (opcional)"
              value={form.priceWholesale ?? 0}
              onChange={(v) =>
                setForm({ ...form, priceWholesale: v > 0 ? v : null })
              }
            />
            <Input
              label="Stock"
              type="number"
              min={0}
              step="any"
              value={String(form.stock ?? 0)}
              onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
            />
          </div>
        </FormSection>

        <FormSection title="Detalles opcionales">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Marca"
              value={form.brand ?? ''}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
            <Input
              label="Color"
              value={form.color ?? ''}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
            <Input
              label="Modelo / Tamaño"
              value={form.size ?? ''}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
            />
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Descripción</span>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <div>
            <p className="mb-2 text-sm font-medium">Imagen del producto</p>
            <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface/50">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-xs text-[rgb(var(--text-muted))]">Sin imagen</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => void handlePickImage()}>
                Elegir imagen
              </Button>
              {(displayImage || product?.imagePath) && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setRemoveImage(true)
                    setPendingImagePath(null)
                    setPreviewLocalUrl(null)
                  }}
                >
                  Quitar
                </Button>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive !== false}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Activo
          </label>
        </FormSection>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  )
}
