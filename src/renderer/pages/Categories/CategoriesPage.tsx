import { useCallback, useEffect, useState } from 'react'
import type { Category } from '@shared/types/catalog'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { CategoryFormModal } from '../../features/categories/CategoryFormModal'

export function CategoriesPage(): React.JSX.Element {
  const [items, setItems] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await window.api.categories.list({
      search: search || undefined,
      includeInactive
    })
    if (result.ok) setItems(result.data)
    setLoading(false)
  }, [search, includeInactive])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate(): void {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(cat: Category): void {
    setEditing(cat)
    setModalOpen(true)
  }

  async function handleDeactivate(cat: Category): Promise<void> {
    if (
      !confirm(
        `¿Desactivar la categoría "${cat.name}"?\n\nDebe no tener productos ni subcategorías activas. Luego podrá eliminarla de la base de datos.`
      )
    ) {
      return
    }
    const result = await window.api.categories.deactivate(cat.id)
    if (!result.ok) alert(result.error)
    else void load()
  }

  async function handleDestroy(cat: Category): Promise<void> {
    if (
      !confirm(
        `¿Eliminar definitivamente "${cat.name}" de la base de datos?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return
    }
    const result = await window.api.categories.destroy(cat.id)
    if (!result.ok) alert(result.error)
    else void load()
  }

  const mainCount = items.filter((c) => !c.parentId).length
  const subCount = items.filter((c) => c.parentId).length

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Categorías</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            {mainCount} categoría(s) · {subCount} subcategoría(s)
          </p>
        </div>
        <Button onClick={openCreate}>+ Nueva categoría</Button>
      </header>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-[240px] flex-1">
          <Input
            label="Buscar"
            placeholder="Nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Mostrar inactivas
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-elevated">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Productos</th>
              <th className="px-4 py-3 font-medium">Subcat.</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[rgb(var(--text-muted))]">
                  Cargando...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[rgb(var(--text-muted))]">
                  Sin categorías
                </td>
              </tr>
            ) : (
              items.map((cat) => (
                <tr
                  key={cat.id}
                  className="border-b border-surface-border/60 hover:bg-surface-elevated/50"
                >
                  <td className="px-4 py-3">
                    <div className={`font-medium ${cat.parentId ? 'pl-4' : ''}`}>
                      {cat.parentId && (
                        <span className="mr-1 text-[rgb(var(--text-muted))]">↳</span>
                      )}
                      {cat.name}
                    </div>
                    {cat.description && (
                      <div className="text-xs text-[rgb(var(--text-muted))]">{cat.description}</div>
                    )}
                    {cat.parentName && (
                      <div className="text-xs text-brand">Dentro de: {cat.parentName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={cat.parentId ? 'default' : 'success'}>
                      {cat.parentId ? 'Subcategoría' : 'Principal'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{cat.productCount}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {cat.parentId ? '—' : cat.subcategoryCount}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={cat.isActive ? 'success' : 'muted'}>
                      {cat.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" type="button" onClick={() => openEdit(cat)}>
                        Editar
                      </Button>
                      {cat.isActive ? (
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => void handleDeactivate(cat)}
                        >
                          Desactivar
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          type="button"
                          onClick={() => void handleDestroy(cat)}
                        >
                          Eliminar
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

      <CategoryFormModal
        open={modalOpen}
        category={editing}
        allCategories={items}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  )
}
