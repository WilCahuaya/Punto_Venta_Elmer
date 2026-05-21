import { FormEvent, useEffect, useState } from 'react'
import type { Category } from '@shared/types/catalog'
import type { Product, ProductInput } from '@shared/types/catalog'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { Select } from '../../components/ui/Select'
import { useProductImage } from '../../hooks/useProductImage'

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
    size: '',
    color: '',
    costPrice: 0,
    priceRetail: 0,
    priceWholesale: 0,
    isActive: true
  }
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

  const storedImageUrl = useProductImage(product?.imagePath)

  useEffect(() => {
    if (!open) return
    if (product) {
      setForm({
        name: product.name,
        barcode: product.barcode ?? '',
        categoryId: product.categoryId,
        stock: product.stock,
        stockMin: product.stockMin,
        size: product.size ?? '',
        color: product.color ?? '',
        costPrice: product.costPrice,
        priceRetail: product.priceRetail,
        priceWholesale: product.priceWholesale,
        isActive: product.isActive
      })
    } else {
      setForm(defaultForm())
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

  const displayImage = removeImage
    ? null
    : previewLocalUrl ?? storedImageUrl

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload: ProductInput = {
      ...form,
      barcode: form.barcode || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      size: form.size || null,
      color: form.color || null,
      pendingImagePath,
      removeImage
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

  const categoryOptions = categories
    .filter((c) => c.isActive)
    .map((c) => ({ value: String(c.id), label: c.name }))

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
      <form id="product-form" onSubmit={(e) => void handleSubmit(e)}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <Input
              label="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
            <Input
              label="Código de barras"
              value={form.barcode ?? ''}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
            <Select
              label="Categoría"
              value={form.categoryId ? String(form.categoryId) : ''}
              onChange={(v) =>
                setForm({ ...form, categoryId: v ? Number(v) : null })
              }
              options={categoryOptions}
              placeholder="Sin categoría"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Talla"
                value={form.size ?? ''}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
              />
              <Input
                label="Color"
                value={form.color ?? ''}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Stock"
                type="number"
                min={0}
                step="any"
                value={String(form.stock ?? 0)}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              />
              <Input
                label="Stock mínimo"
                type="number"
                min={0}
                step="any"
                value={String(form.stockMin ?? 0)}
                onChange={(e) => setForm({ ...form, stockMin: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <MoneyInput
              label="Precio compra"
              value={form.costPrice ?? 0}
              onChange={(v) => setForm({ ...form, costPrice: v })}
            />
            <MoneyInput
              label="Precio menor"
              value={form.priceRetail}
              onChange={(v) => setForm({ ...form, priceRetail: v })}
              required
            />
            <MoneyInput
              label="Precio mayor"
              value={form.priceWholesale}
              onChange={(v) => setForm({ ...form, priceWholesale: v })}
              required
            />

            <div>
              <p className="mb-2 text-sm font-medium">Imagen</p>
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
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  )
}
