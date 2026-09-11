import { FormEvent, useEffect, useState } from 'react'
import type { Category, Product, ProductInput } from '@shared/types/catalog'
import { deriveBarcodeFromCatalog, normalizeScannedBarcode } from '@shared/lib/product-barcode'
import { DOZEN_MIN_UNITS, DOZEN_UNITS, packSalePrice } from '@shared/lib/product-packs'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { MoneyInput } from '../../components/ui/MoneyInput'
import { NumberInput } from '../../components/ui/NumberInput'
import { Select } from '../../components/ui/Select'
import { useProductImage } from '../../hooks/useProductImage'
import { buildCategorySelectOptions } from '../../lib/category-options'

interface ProductFormModalProps {
  open: boolean
  product: Product | null
  categories: Category[]
  /** Código escaneado al crear desde el lector (modo híbrido). */
  initialBarcode?: string
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
    priceDozen: null,
    planchaQty: null,
    pricePlancha: null,
    cajonQty: null,
    priceCajon: null,
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

function PackTotalHint({
  units,
  unitPrice,
  emptyText
}: {
  units?: number | null
  unitPrice?: number | null
  emptyText: string
}): React.JSX.Element {
  const qty = units ?? 0
  const price = unitPrice ?? 0
  if (qty > 0 && price > 0) {
    const total = packSalePrice(price, qty)
    return (
      <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
        Al vender se cobra <MoneyDisplay amount={price} size="sm" className="inline text-xs" /> ×{' '}
        {qty} ={' '}
        <MoneyDisplay amount={total} size="sm" className="inline text-xs font-medium" />
      </p>
    )
  }
  return <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{emptyText}</p>
}

export function ProductFormModal({
  open,
  product,
  categories,
  initialBarcode,
  onClose,
  onSaved
}: ProductFormModalProps): React.JSX.Element {
  const [form, setForm] = useState<ProductInput>(defaultForm())
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    categoryId?: string
    costPrice?: string
    priceRetail?: string
    priceWholesale?: string
    priceDozen?: string
    planchaQty?: string
    pricePlancha?: string
    cajonQty?: string
    priceCajon?: string
    stockMin?: string
  }>({})
  const [saving, setSaving] = useState(false)
  const [pendingImagePath, setPendingImagePath] = useState<string | null>(null)
  const [previewLocalUrl, setPreviewLocalUrl] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)

  const storedImageUrl = useProductImage(product?.imagePath)
  const isCreate = !product
  const isScannedCreate = isCreate && Boolean(initialBarcode?.trim())
  const isManualCreate = isCreate && !isScannedCreate

  useEffect(() => {
    if (!open) return
    if (product) {
      setForm({
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
        priceDozen: product.priceDozen,
        planchaQty: product.planchaQty,
        pricePlancha: product.pricePlancha,
        cajonQty: product.cajonQty,
        priceCajon: product.priceCajon,
        isActive: product.isActive
      })
    } else if (initialBarcode?.trim()) {
      setForm({
        ...defaultForm(),
        barcode: normalizeScannedBarcode(initialBarcode.trim())
      })
    } else {
      setForm(defaultForm())
    }
    setPendingImagePath(null)
    setPreviewLocalUrl(null)
    setRemoveImage(false)
    setError(null)
    setFieldErrors({})
  }, [open, product, initialBarcode])

  useEffect(() => {
    if (!open || !isManualCreate) return
    const category = categories.find((c) => c.id === form.categoryId)
    const preview = deriveBarcodeFromCatalog(category?.name ?? '', form.name)
    setForm((f) => (f.barcode === preview ? f : { ...f, barcode: preview }))
  }, [open, isManualCreate, form.categoryId, form.name, categories])

  async function handlePickImage(): Promise<void> {
    const result = await window.api.products.pickImage()
    if (!result.ok || !result.data) return
    setPendingImagePath(result.data)
    setRemoveImage(false)
    setPreviewLocalUrl(`pos-media://img/${encodeURIComponent(result.data)}`)
  }

  const displayImage = removeImage ? null : previewLocalUrl ?? storedImageUrl

  function validateForm(): boolean {
    const next: typeof fieldErrors = {}
    if (!form.name?.trim()) next.name = 'El nombre es obligatorio'
    if (!form.categoryId) next.categoryId = 'La categoría es obligatoria'
    if (isCreate && (form.costPrice == null || form.costPrice <= 0)) {
      next.costPrice = 'El precio de compra es obligatorio'
    } else if ((form.costPrice ?? 0) < 0) {
      next.costPrice = 'El precio de compra no puede ser negativo'
    }
    if (form.priceRetail == null || form.priceRetail <= 0) {
      next.priceRetail = 'El precio por menor es obligatorio'
    }
    if (isCreate && (form.priceWholesale == null || form.priceWholesale <= 0)) {
      next.priceWholesale = 'El precio por mayor es obligatorio'
    } else if (form.priceWholesale != null && form.priceWholesale < 0) {
      next.priceWholesale = 'El precio por mayor no puede ser negativo'
    }
    if ((form.priceDozen ?? 0) < 0) {
      next.priceDozen = 'El precio por unidad de la docena no puede ser negativo'
    }
    const planchaQty = form.planchaQty ?? 0
    const pricePlancha = form.pricePlancha ?? 0
    if (planchaQty < 0) next.planchaQty = 'La cantidad no puede ser negativa'
    if (pricePlancha < 0) next.pricePlancha = 'El precio no puede ser negativo'
    if (planchaQty > 0 && pricePlancha <= 0) {
      next.pricePlancha = 'Indique el precio por unidad de la plancha'
    }
    if (pricePlancha > 0 && planchaQty <= 0) {
      next.planchaQty = 'Indique las unidades por plancha'
    }
    const cajonQty = form.cajonQty ?? 0
    const priceCajon = form.priceCajon ?? 0
    if (cajonQty < 0) next.cajonQty = 'La cantidad no puede ser negativa'
    if (priceCajon < 0) next.priceCajon = 'El precio no puede ser negativo'
    if (cajonQty > 0 && priceCajon <= 0) {
      next.priceCajon = 'Indique el precio por unidad del cajón'
    }
    if (priceCajon > 0 && cajonQty <= 0) {
      next.cajonQty = 'Indique las unidades por cajón'
    }
    if ((form.stockMin ?? 0) > (form.stock ?? 0)) {
      next.stockMin = 'El stock mínimo no puede ser mayor que el stock actual'
    }
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!validateForm()) return

    const normalizedBarcode = form.barcode?.trim()
      ? normalizeScannedBarcode(form.barcode.trim())
      : null

    if (isScannedCreate && normalizedBarcode) {
      const dup = await window.api.products.lookupBarcode(normalizedBarcode)
      if (dup.ok) {
        setError(`El código ya está registrado en "${dup.data.name}"`)
        return
      }
    }

    setSaving(true)
    setError(null)

    const payload: ProductInput = {
      ...form,
      productCode: null,
      barcode: normalizedBarcode,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      brand: form.brand?.trim() || null,
      size: form.size?.trim() || null,
      color: form.color?.trim() || null,
      description: form.description?.trim() || null,
      priceWholesale:
        form.priceWholesale != null && form.priceWholesale > 0 ? form.priceWholesale : null,
      priceDozen: form.priceDozen != null && form.priceDozen > 0 ? form.priceDozen : null,
      planchaQty: form.planchaQty != null && form.planchaQty > 0 ? form.planchaQty : null,
      pricePlancha:
        form.pricePlancha != null && form.pricePlancha > 0 ? form.pricePlancha : null,
      cajonQty: form.cajonQty != null && form.cajonQty > 0 ? form.cajonQty : null,
      priceCajon: form.priceCajon != null && form.priceCajon > 0 ? form.priceCajon : null,
      stockMin: form.stockMin ?? 0,
      pendingImagePath,
      removeImage,
      skipAutoBarcode: isScannedCreate
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
  const modalTitle = product
    ? 'Editar producto'
    : isScannedCreate
      ? 'Nuevo producto — código escaneado'
      : 'Nuevo producto'

  return (
    <Modal
      open={open}
      title={modalTitle}
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
          {isScannedCreate && (
            <div className="rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm text-[rgb(var(--text-muted))]">
              Código del empaque detectado. Complete nombre, categoría y precios.
            </div>
          )}

          <Input
            label="Nombre del producto"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            error={fieldErrors.name}
            autoFocus
          />

          <Select
            label="Categoría"
            value={form.categoryId ? String(form.categoryId) : ''}
            onChange={(v) => setForm({ ...form, categoryId: v ? Number(v) : null })}
            options={categoryOptions}
            placeholder="Seleccione una categoría"
            error={fieldErrors.categoryId}
            required
          />

          <div>
            <Input
              label="Código de barras"
              value={form.barcode ?? ''}
              readOnly={isCreate}
              onChange={
                isCreate
                  ? undefined
                  : (e) => setForm({ ...form, barcode: e.target.value })
              }
              autoComplete="off"
              className="font-mono"
              placeholder={isManualCreate ? 'Se genera al completar nombre y categoría' : ''}
            />
            {isManualCreate && (
              <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                Se genera automáticamente con iniciales de categoría y producto (ej. RH-CP-3847)
              </p>
            )}
            {isScannedCreate && (
              <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                Código del producto escaneado (no editable)
              </p>
            )}
          </div>

          {product?.productCode && (
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Código interno: <span className="font-mono">{product.productCode}</span>
            </p>
          )}
        </FormSection>

        <FormSection title="Precios y stock">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MoneyInput
              label="Precio de compra"
              value={form.costPrice ?? 0}
              onChange={(v) => setForm({ ...form, costPrice: v })}
              required={isCreate}
              error={fieldErrors.costPrice}
            />
            <MoneyInput
              label="Precio por menor"
              value={form.priceRetail}
              onChange={(v) => setForm({ ...form, priceRetail: v })}
              required
              error={fieldErrors.priceRetail}
            />
            <MoneyInput
              label="Precio por mayor"
              value={form.priceWholesale ?? 0}
              onChange={(v) =>
                setForm({ ...form, priceWholesale: v > 0 ? v : null })
              }
              required={isCreate}
              error={fieldErrors.priceWholesale}
            />
            <div>
              {isCreate ? (
                <NumberInput
                  label="Stock inicial"
                  min={0}
                  emptyValue={0}
                  value={form.stock ?? 0}
                  onChange={(v) => setForm({ ...form, stock: v })}
                />
              ) : (
                <Input
                  label="Stock actual"
                  type="number"
                  value={String(form.stock ?? 0)}
                  readOnly
                  className="cursor-not-allowed opacity-80"
                />
              )}
              <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                {isCreate
                  ? 'Después de guardar, el stock solo baja al vender.'
                  : 'El stock solo baja al vender. Para agregar unidades use Ajustar stock.'}
              </p>
            </div>
          </div>
          <NumberInput
            label="Stock mínimo (alerta)"
            min={0}
            max={form.stock ?? 0}
            emptyValue={0}
            value={form.stockMin ?? 0}
            onChange={(v) => setForm({ ...form, stockMin: v })}
            error={fieldErrors.stockMin}
          />
          <p className="text-sm font-medium">Empaques (opcional)</p>
          <p className="text-xs text-[rgb(var(--text-muted))]">
            El precio de docena es por unidad y se puede usar desde 3 unidades. Plancha y cajón se
            venden por empaque completo.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <MoneyInput
                label="Precio por unidad (docena)"
                value={form.priceDozen ?? 0}
                onChange={(v) =>
                  setForm({ ...form, priceDozen: v > 0 ? v : null })
                }
                error={fieldErrors.priceDozen}
              />
              <PackTotalHint
                units={DOZEN_UNITS}
                unitPrice={form.priceDozen}
                emptyText={`Desde ${DOZEN_MIN_UNITS} unidades se usa este precio. ${DOZEN_UNITS} und. es la referencia de una docena.`}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <NumberInput
                label="Plancha (cantidad)"
                min={0}
                emptyValue={0}
                value={form.planchaQty ?? 0}
                onChange={(v) =>
                  setForm({ ...form, planchaQty: v > 0 ? v : null })
                }
                error={fieldErrors.planchaQty}
              />
              <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                Unidades que contiene una plancha. 0 si no aplica.
              </p>
            </div>
            <div>
              <MoneyInput
                label="Precio por unidad (plancha)"
                value={form.pricePlancha ?? 0}
                onChange={(v) =>
                  setForm({ ...form, pricePlancha: v > 0 ? v : null })
                }
                error={fieldErrors.pricePlancha}
              />
              <PackTotalHint
                units={form.planchaQty}
                unitPrice={form.pricePlancha}
                emptyText="Se cobra × la cantidad de la plancha."
              />
            </div>
            <div>
              <NumberInput
                label="Cajón (cantidad)"
                min={0}
                emptyValue={0}
                value={form.cajonQty ?? 0}
                onChange={(v) => setForm({ ...form, cajonQty: v > 0 ? v : null })}
                error={fieldErrors.cajonQty}
              />
              <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                Unidades que contiene un cajón. 0 si no aplica.
              </p>
            </div>
            <div>
              <MoneyInput
                label="Precio por unidad (cajón)"
                value={form.priceCajon ?? 0}
                onChange={(v) =>
                  setForm({ ...form, priceCajon: v > 0 ? v : null })
                }
                error={fieldErrors.priceCajon}
              />
              <PackTotalHint
                units={form.cajonQty}
                unitPrice={form.priceCajon}
                emptyText="Se cobra × la cantidad del cajón."
              />
            </div>
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
