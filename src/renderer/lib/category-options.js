export function buildCategorySelectOptions(categories) {
    return categories
        .filter((c) => c.isActive)
        .map((c) => ({
        value: String(c.id),
        label: c.parentName ? `${c.parentName} › ${c.name}` : c.name
    }));
}
export function buildParentCategoryOptions(categories) {
    return categories
        .filter((c) => c.isActive && c.parentId == null)
        .map((c) => ({ value: String(c.id), label: c.name }));
}
