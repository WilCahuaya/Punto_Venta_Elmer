import { FormEvent, useEffect, useState } from 'react'
import type { Category, CategoryInput } from '@shared/types/catalog'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { buildParentCategoryOptions } from '../../lib/category-options'

interface CategoryFormModalProps {
  open: boolean
  category: Category | null
  allCategories: Category[]
  onClose: () => void
  onSaved: () => void
}

const emptyForm: CategoryInput = {
  name: '',
  parentId: null,
  description: '',
  sortOrder: 0,
  isActive: true
}

export function CategoryFormModal({
  open,
  category,
  allCategories,
  onClose,
  onSaved
}: CategoryFormModalProps): React.JSX.Element {
  const [form, setForm] = useState<CategoryInput>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const parentOptions = buildParentCategoryOptions(
    allCategories.filter((c) => !category || c.id !== category.id)
  )

  useEffect(() => {
    if (!open) return
    if (category) {
      setForm({
        name: category.name,
        parentId: category.parentId,
        description: category.description ?? '',
        sortOrder: category.sortOrder,
        isActive: category.isActive
      })
    } else {
      setForm(emptyForm)
    }
    setError(null)
  }, [open, category])

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload: CategoryInput = {
      name: form.name,
      parentId: form.parentId ? Number(form.parentId) : null,
      description: form.description || null,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive
    }

    const result = category
      ? await window.api.categories.update(category.id, payload)
      : await window.api.categories.create(payload)

    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSaved()
    onClose()
  }

  const isSubcategory = !!form.parentId

  return (
    <Modal
      open={open}
      title={category ? 'Editar categoría' : 'Nueva categoría'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="category-form" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Select
          label="Tipo"
          value={isSubcategory ? 'sub' : 'main'}
          onChange={(v) =>
            setForm({
              ...form,
              parentId: v === 'sub' ? (parentOptions[0] ? Number(parentOptions[0].value) : null) : null
            })
          }
          options={[
            { value: 'main', label: 'Categoría principal' },
            { value: 'sub', label: 'Subcategoría' }
          ]}
        />
        {isSubcategory && (
          <Select
            label="Categoría padre"
            value={form.parentId ? String(form.parentId) : ''}
            onChange={(v) => setForm({ ...form, parentId: v ? Number(v) : null })}
            options={parentOptions}
            placeholder="Seleccione categoría padre"
            required
          />
        )}
        <Input
          label="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoFocus
          required
        />
        <Input
          label="Descripción"
          value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Input
          label="Orden"
          type="number"
          value={String(form.sortOrder ?? 0)}
          onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive !== false}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded border-surface-border"
          />
          Activa
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </Modal>
  )
}
