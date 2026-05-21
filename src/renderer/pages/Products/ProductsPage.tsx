import { useCallback, useEffect, useState } from 'react'
import type { Category, Product } from '@shared/types/catalog'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { Select } from '../../components/ui/Select'
import { ProductFormModal } from '../../features/products/ProductFormModal'
import { useProductImage } from '../../hooks/useProductImage'

function ProductThumb({ imagePath }: { imagePath: string | null }): React.JSX.Element {
  const url = useProductImage(imagePath)
  return (
    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-surface-border bg-surface">
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[10px] text-[rgb(var(--text-muted))]">—</span>
      )}
    </div>
  )
}

export function ProductsPage(): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const loadCategories = useCallback(async () => {
    const result = await window.api.categories.list({ includeInactive: false })
    if (result.ok) setCategories(result.data)
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const result = await window.api.products.list({
      search: search || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      lowStockOnly,
      includeInactive
    })
    if (result.ok) setProducts(result.data)
    setLoading(false)
  }, [search, categoryId, lowStockOnly, includeInactive])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  function openCreate(): void {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(p: Product): void {
    setEditing(p)
    setModalOpen(true)
  }

  async function handleDelete(p: Product): Promise<void> {
    if (!confirm(`¿Desactivar el producto "${p.name}"?`)) return
    const result = await window.api.products.delete(p.id)
    if (!result.ok) alert(result.error)
    else void loadProducts()
  }

  const categoryFilterOptions = categories.map((c) => ({
    value: String(c.id),
    label: c.name
  }))

  const lowStockCount = products.filter((p) => p.isLowStock && p.isActive).length

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Productos</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            {products.length} producto(s)
            {lowStockOnly && lowStockCount > 0 && (
              <span className="ml-2 text-amber-600">· {lowStockCount} con stock bajo</span>
            )}
          </p>
        </div>
        <Button onClick={openCreate}>+ Nuevo producto</Button>
      </header>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Buscar"
          placeholder="Nombre o código de barras..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label="Categoría"
          value={categoryId}
          onChange={setCategoryId}
          options={categoryFilterOptions}
          placeholder="Todas"
        />
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Solo stock bajo
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Mostrar inactivos
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-elevated">
            <tr>
              <th className="px-3 py-3 font-medium">Img</th>
              <th className="px-3 py-3 font-medium">Producto</th>
              <th className="px-3 py-3 font-medium">Categoría</th>
              <th className="px-3 py-3 font-medium">Stock</th>
              <th className="px-3 py-3 font-medium">Menor</th>
              <th className="px-3 py-3 font-medium">Mayor</th>
              <th className="px-3 py-3 font-medium">Estado</th>
              <th className="px-3 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[rgb(var(--text-muted))]">
                  Cargando...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[rgb(var(--text-muted))]">
                  Sin productos
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-surface-border/60 hover:bg-surface-elevated/50"
                >
                  <td className="px-3 py-2">
                    <ProductThumb imagePath={p.imagePath} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{p.name}</div>
                    {p.barcode && (
                      <div className="font-mono text-xs text-[rgb(var(--text-muted))]">
                        {p.barcode}
                      </div>
                    )}
                    {(p.size || p.color) && (
                      <div className="text-xs text-[rgb(var(--text-muted))]">
                        {[p.size, p.color].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">{p.categoryName ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={p.isLowStock ? 'font-medium text-amber-600' : ''}>
                      {p.stock}
                    </span>
                    <span className="text-xs text-[rgb(var(--text-muted))]"> / {p.stockMin}</span>
                    {p.isLowStock && (
                      <span className="ml-1">
                        <Badge variant="warning">Bajo</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <MoneyDisplay amount={p.priceRetail} size="sm" />
                  </td>
                  <td className="px-3 py-2">
                    <MoneyDisplay amount={p.priceWholesale} size="sm" />
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={p.isActive ? 'success' : 'muted'}>
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" type="button" onClick={() => openEdit(p)}>
                        Editar
                      </Button>
                      {p.isActive && (
                        <Button variant="ghost" type="button" onClick={() => void handleDelete(p)}>
                          Desactivar
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

      <ProductFormModal
        open={modalOpen}
        product={editing}
        categories={categories}
        onClose={() => setModalOpen(false)}
        onSaved={() => void loadProducts()}
      />
    </div>
  )
}
