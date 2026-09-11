import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CategoryFormModal } from '../../features/categories/CategoryFormModal';
export function CategoriesPage() {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [includeInactive, setIncludeInactive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const load = useCallback(async () => {
        setLoading(true);
        const result = await window.api.categories.list({
            search: search || undefined,
            includeInactive
        });
        if (result.ok)
            setItems(result.data);
        setLoading(false);
    }, [search, includeInactive]);
    useEffect(() => {
        void load();
    }, [load]);
    function openCreate() {
        setEditing(null);
        setModalOpen(true);
    }
    function openEdit(cat) {
        setEditing(cat);
        setModalOpen(true);
    }
    async function handleDeactivate(cat) {
        if (!confirm(`¿Desactivar la categoría "${cat.name}"?\n\nDebe no tener productos ni subcategorías activas. Luego podrá eliminarla de la base de datos.`)) {
            return;
        }
        const result = await window.api.categories.deactivate(cat.id);
        if (!result.ok)
            alert(result.error);
        else
            void load();
    }
    async function handleDestroy(cat) {
        if (!confirm(`¿Eliminar definitivamente "${cat.name}" de la base de datos?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }
        const result = await window.api.categories.destroy(cat.id);
        if (!result.ok)
            alert(result.error);
        else
            void load();
    }
    const mainCount = items.filter((c) => !c.parentId).length;
    const subCount = items.filter((c) => c.parentId).length;
    return (_jsxs("div", { children: [_jsxs("header", { className: "mb-6 flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold", children: "Categor\u00EDas" }), _jsxs("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: [mainCount, " categor\u00EDa(s) \u00B7 ", subCount, " subcategor\u00EDa(s)"] })] }), _jsx(Button, { onClick: openCreate, children: "+ Nueva categor\u00EDa" })] }), _jsxs("div", { className: "mb-4 flex flex-wrap items-end gap-4", children: [_jsx("div", { className: "min-w-[240px] flex-1", children: _jsx(Input, { label: "Buscar", placeholder: "Nombre o descripci\u00F3n...", value: search, onChange: (e) => setSearch(e.target.value) }) }), _jsxs("label", { className: "flex items-center gap-2 pb-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: includeInactive, onChange: (e) => setIncludeInactive(e.target.checked) }), "Mostrar inactivas"] })] }), _jsx("div", { className: "overflow-hidden rounded-xl border border-surface-border", children: _jsxs("table", { className: "w-full text-left text-sm", children: [_jsx("thead", { className: "border-b border-surface-border bg-surface-elevated", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 font-medium", children: "Nombre" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Tipo" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Productos" }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Subcat." }), _jsx("th", { className: "px-4 py-3 font-medium", children: "Estado" }), _jsx("th", { className: "px-4 py-3 font-medium text-right", children: "Acciones" })] }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-4 py-8 text-center text-[rgb(var(--text-muted))]", children: "Cargando..." }) })) : items.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-4 py-8 text-center text-[rgb(var(--text-muted))]", children: "Sin categor\u00EDas" }) })) : (items.map((cat) => (_jsxs("tr", { className: "border-b border-surface-border/60 hover:bg-surface-elevated/50", children: [_jsxs("td", { className: "px-4 py-3", children: [_jsxs("div", { className: `font-medium ${cat.parentId ? 'pl-4' : ''}`, children: [cat.parentId && (_jsx("span", { className: "mr-1 text-[rgb(var(--text-muted))]", children: "\u21B3" })), cat.name] }), cat.description && (_jsx("div", { className: "text-xs text-[rgb(var(--text-muted))]", children: cat.description })), cat.parentName && (_jsxs("div", { className: "text-xs text-brand", children: ["Dentro de: ", cat.parentName] }))] }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: cat.parentId ? 'default' : 'success', children: cat.parentId ? 'Subcategoría' : 'Principal' }) }), _jsx("td", { className: "px-4 py-3 tabular-nums", children: cat.productCount }), _jsx("td", { className: "px-4 py-3 tabular-nums", children: cat.parentId ? '—' : cat.subcategoryCount }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: cat.isActive ? 'success' : 'muted', children: cat.isActive ? 'Activa' : 'Inactiva' }) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", type: "button", onClick: () => openEdit(cat), children: "Editar" }), cat.isActive ? (_jsx(Button, { variant: "ghost", type: "button", onClick: () => void handleDeactivate(cat), children: "Desactivar" })) : (_jsx(Button, { variant: "danger", type: "button", onClick: () => void handleDestroy(cat), children: "Eliminar" }))] }) })] }, cat.id)))) })] }) }), _jsx(CategoryFormModal, { open: modalOpen, category: editing, allCategories: items, onClose: () => setModalOpen(false), onSaved: () => void load() })] }));
}
