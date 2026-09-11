import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { paymentMethodLabel } from '@shared/lib/payment';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { CreditPayModal } from '../../features/credits/CreditPayModal';
import { formatDateTime } from '../../lib/datetime';
import { useCashStore } from '../../stores/cash.store';
export function CreditsPage() {
    const refreshCash = useCashStore((s) => s.refresh);
    const [search, setSearch] = useState('');
    const [includeSettled, setIncludeSettled] = useState(false);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [payEntry, setPayEntry] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const res = await window.api.sales.listCredits({
            search: search.trim() || undefined,
            includeSettled
        });
        setLoading(false);
        if (!res.ok) {
            setError(res.error);
            setEntries([]);
            return;
        }
        setEntries(res.data);
    }, [search, includeSettled]);
    useEffect(() => {
        const t = window.setTimeout(() => void load(), 150);
        return () => window.clearTimeout(t);
    }, [load]);
    const totalRemaining = entries.reduce((sum, e) => sum + e.remaining, 0);
    return (_jsxs("div", { children: [_jsxs("header", { className: "mb-6 flex flex-wrap items-end justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold", children: "Fiados" }), _jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Productos fiados, a qui\u00E9n se fi\u00F3 y cu\u00E1nto deben. Los abonos entran a la caja abierta." })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: "Saldo pendiente" }), _jsx(MoneyDisplay, { amount: totalRemaining, size: "lg", className: "font-semibold" })] })] }), message && (_jsx("p", { className: "mb-4 rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand", children: message })), error && (_jsx("p", { className: "mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600", children: error })), _jsxs("div", { className: "mb-4 flex flex-wrap items-end gap-3", children: [_jsx("div", { className: "min-w-[240px] flex-1", children: _jsx(Input, { label: "Buscar", placeholder: "Nombre, ticket o producto...", value: search, onChange: (e) => setSearch(e.target.value) }) }), _jsxs("label", { className: "flex items-center gap-2 pb-2.5 text-sm", children: [_jsx("input", { type: "checkbox", checked: includeSettled, onChange: (e) => setIncludeSettled(e.target.checked) }), "Incluir saldados"] }), _jsx(Button, { variant: "secondary", type: "button", onClick: () => void load(), disabled: loading, children: "Actualizar" })] }), loading ? (_jsx("p", { className: "text-[rgb(var(--text-muted))]", children: "Cargando fiados..." })) : entries.length === 0 ? (_jsx("div", { className: "rounded-xl border border-dashed border-surface-border p-8 text-center text-[rgb(var(--text-muted))]", children: search.trim()
                    ? 'Ningún fiado coincide con la búsqueda'
                    : includeSettled
                        ? 'Aún no hay ventas fiadas'
                        : 'No hay fiados pendientes' })) : (_jsx("div", { className: "space-y-3", children: entries.map((entry) => {
                    const settled = entry.remaining <= 0.004;
                    const open = expandedId === entry.id;
                    return (_jsxs("article", { className: "rounded-xl border border-surface-border bg-surface-elevated p-4", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("h3", { className: "font-semibold", children: entry.creditTo }), _jsx(Badge, { variant: settled ? 'success' : 'warning', children: settled ? 'Saldado' : 'Pendiente' })] }), _jsxs("p", { className: "mt-1 text-sm text-[rgb(var(--text-muted))]", children: ["Ticket ", entry.ticketNumber, " \u00B7 ", formatDateTime(entry.createdAt)] }), _jsx("p", { className: "mt-2 text-sm", children: entry.items
                                                    .map((item) => {
                                                    const qtyLeft = item.quantity - item.returnedQuantity;
                                                    return qtyLeft > 0
                                                        ? `${item.productName} × ${qtyLeft}`
                                                        : `${item.productName} (devuelto)`;
                                                })
                                                    .join(' · ') })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: "Debe" }), _jsx(MoneyDisplay, { amount: entry.remaining, size: "lg", className: settled ? '' : 'font-semibold text-amber-700 dark:text-amber-400' }), _jsxs("p", { className: "mt-1 text-xs text-[rgb(var(--text-muted))]", children: ["Cobrado ", _jsx(MoneyDisplay, { amount: entry.paidTotal, size: "sm", className: "inline" }), ' · ', "Neto ", _jsx(MoneyDisplay, { amount: entry.netTotal, size: "sm", className: "inline" })] })] })] }), _jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [!settled && (_jsx(Button, { type: "button", onClick: () => setPayEntry(entry), children: "Registrar abono" })), _jsx(Button, { type: "button", variant: "ghost", onClick: () => setExpandedId(open ? null : entry.id), children: open ? 'Ocultar detalle' : 'Ver cobros' })] }), open && (_jsx("div", { className: "mt-3 overflow-hidden rounded-lg border border-surface-border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-surface", children: _jsxs("tr", { className: "text-left", children: [_jsx("th", { className: "px-3 py-2 font-medium", children: "Fecha" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "Tipo" }), _jsx("th", { className: "px-3 py-2 font-medium", children: "M\u00E9todo" }), _jsx("th", { className: "px-3 py-2 font-medium text-right", children: "Monto" })] }) }), _jsx("tbody", { children: entry.payments.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 4, className: "px-3 py-3 text-[rgb(var(--text-muted))]", children: "Sin adelanto ni abonos todav\u00EDa" }) })) : (entry.payments.map((p) => (_jsxs("tr", { className: "border-t border-surface-border/50", children: [_jsx("td", { className: "px-3 py-2", children: formatDateTime(p.createdAt) }), _jsx("td", { className: "px-3 py-2", children: p.kind === 'refund' ? 'Devolución' : 'Abono' }), _jsx("td", { className: "px-3 py-2", children: paymentMethodLabel(p.paymentMethod) }), _jsx("td", { className: "px-3 py-2 text-right", children: _jsx(MoneyDisplay, { amount: p.kind === 'refund' ? -p.amount : p.amount, size: "sm" }) })] }, p.id)))) })] }) }))] }, entry.id));
                }) })), _jsx(CreditPayModal, { open: payEntry != null, entry: payEntry, onClose: () => setPayEntry(null), onPaid: (updated) => {
                    setMessage(updated.remaining <= 0.004
                        ? `Fiado ${updated.ticketNumber} saldado`
                        : `Abono registrado en ${updated.ticketNumber}`);
                    setPayEntry(null);
                    void refreshCash();
                    void load();
                } })] }));
}
