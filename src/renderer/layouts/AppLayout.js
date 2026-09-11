import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/auth.store';
import { useCashStore } from '../stores/cash.store';
import { useSettingsStore } from '../stores/settings.store';
const navSections = [
    {
        items: [
            { to: '/dashboard', label: 'Inicio' },
            { to: '/pos', label: 'POS' }
        ]
    },
    {
        id: 'finanzas',
        label: 'Finanzas',
        collapsible: true,
        items: [
            { to: '/cash', label: 'Caja' },
            { to: '/credits', label: 'Fiados' }
        ]
    },
    {
        id: 'catalogo',
        label: 'Catálogo',
        collapsible: true,
        items: [
            { to: '/products', label: 'Productos' },
            { to: '/categories', label: 'Categorías' },
            { to: '/labels', label: 'Etiquetas' }
        ]
    },
    {
        items: [
            { to: '/backups', label: 'Backups' },
            { to: '/settings', label: 'Configuración' }
        ]
    }
];
function isRouteActive(pathname, to) {
    return pathname === to || pathname.startsWith(`${to}/`);
}
function sectionHasActiveItem(pathname, items) {
    return items.some((item) => isRouteActive(pathname, item.to));
}
function readExpanded(id, defaultOpen) {
    try {
        const stored = localStorage.getItem(`nav-expanded-${id}`);
        if (stored === 'true')
            return true;
        if (stored === 'false')
            return false;
    }
    catch {
        // ignore
    }
    return defaultOpen;
}
function NavItems({ items }) {
    return (_jsx("div", { className: "space-y-0.5", children: items.map((item) => (_jsx(NavLink, { to: item.to, className: ({ isActive }) => [
                'block rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                    ? 'bg-brand/10 font-medium text-brand'
                    : 'text-[rgb(var(--text-muted))] hover:bg-surface-border/30 hover:text-[rgb(var(--text))]'
            ].join(' '), children: item.label }, item.to))) }));
}
function CollapsibleNavSection({ section, defaultOpen }) {
    const id = section.id;
    const [expanded, setExpanded] = useState(() => readExpanded(id, defaultOpen));
    useEffect(() => {
        if (defaultOpen)
            setExpanded(true);
    }, [defaultOpen]);
    function toggle() {
        setExpanded((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(`nav-expanded-${id}`, String(next));
            }
            catch {
                // ignore
            }
            return next;
        });
    }
    return (_jsxs("div", { children: [_jsxs("button", { type: "button", onClick: toggle, "aria-expanded": expanded, className: "mb-1 flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] transition-colors hover:bg-surface-border/30 hover:text-[rgb(var(--text))]", children: [_jsx("span", { children: section.label }), _jsx("svg", { className: [
                            'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                            expanded ? 'rotate-180' : ''
                        ].join(' '), viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": true, children: _jsx("path", { fillRule: "evenodd", d: "M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z", clipRule: "evenodd" }) })] }), expanded && (_jsx("div", { className: "space-y-0.5 pl-1", children: _jsx(NavItems, { items: section.items }) }))] }));
}
export function AppLayout() {
    const location = useLocation();
    const session = useAuthStore((s) => s.session);
    const logout = useAuthStore((s) => s.logout);
    const theme = useSettingsStore((s) => s.theme);
    const save = useSettingsStore((s) => s.save);
    const cashOpen = useCashStore((s) => s.isOpen);
    return (_jsxs("div", { className: "flex h-screen overflow-hidden", children: [_jsxs("aside", { className: "flex w-56 shrink-0 flex-col border-r border-surface-border bg-surface-elevated", children: [_jsxs("div", { className: "border-b border-surface-border px-4 py-5", children: [_jsx("h1", { className: "text-lg font-semibold tracking-tight", children: "Punto de Venta" }), _jsx("p", { className: "mt-1 truncate text-xs text-[rgb(var(--text-muted))]", children: session?.displayName ?? session?.username }), _jsx("div", { className: "mt-2", children: _jsxs(Badge, { variant: cashOpen ? 'success' : 'warning', children: ["Caja ", cashOpen ? 'abierta' : 'cerrada'] }) })] }), _jsx("nav", { className: "flex-1 overflow-y-auto p-2", children: navSections.map((section, si) => {
                            const activeInSection = sectionHasActiveItem(location.pathname, section.items);
                            return (_jsx("div", { className: si > 0 ? 'mt-4' : '', children: section.collapsible && section.label && section.id ? (_jsx(CollapsibleNavSection, { section: section, defaultOpen: activeInSection })) : section.label ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]", children: section.label }), _jsx(NavItems, { items: section.items })] })) : (_jsx(NavItems, { items: section.items })) }, section.id ?? `section-${si}`));
                        }) }), _jsxs("div", { className: "space-y-2 border-t border-surface-border p-3", children: [_jsxs(Button, { variant: "secondary", fullWidth: true, onClick: () => void save({ theme: theme === 'light' ? 'dark' : 'light' }), children: ["Tema ", theme === 'light' ? 'oscuro' : 'claro'] }), _jsx(Button, { variant: "ghost", fullWidth: true, onClick: () => void logout(), children: "Cerrar sesi\u00F3n" })] })] }), _jsx("main", { className: "flex-1 overflow-auto bg-surface p-6", children: _jsx(Outlet, {}) })] }));
}
