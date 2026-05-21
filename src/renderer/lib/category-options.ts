import type { Category } from '@shared/types/catalog'

export function buildCategorySelectOptions(categories: Category[]): { value: string; label: string }[] {
  return categories
    .filter((c) => c.isActive)
    .map((c) => ({
      value: String(c.id),
      label: c.parentName ? `${c.parentName} › ${c.name}` : c.name
    }))
}

export function buildParentCategoryOptions(categories: Category[]): { value: string; label: string }[] {
  return categories
    .filter((c) => c.isActive && c.parentId == null)
    .map((c) => ({ value: String(c.id), label: c.name }))
}
