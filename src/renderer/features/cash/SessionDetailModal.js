import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../lib/datetime';
export function SessionDetailModal({ open, sessionId, onClose, onOpenTickets }) {
    const [summary, setSummary] = useState(null);
    const [movements, setMovements] = useState([]);
    const [ticketCount, setTicketCount] = useState(0);
    const load = useCallback(async () => {
        if (!sessionId)
            return;
        const [sRes, mRes, salesRes] = await Promise.all([
            window.api.cash.getSession(sessionId),
            window.api.cash.listMovements(sessionId),
            window.api.sales.listBySession(sessionId)
        ]);
        if (sRes.ok)
            setSummary(sRes.data);
        if (mRes.ok)
            setMovements(mRes.data);
        if (salesRes.ok)
            setTicketCount(salesRes.data.length);
    }, [sessionId]);
    useEffect(() => {
        if (!open || !sessionId)
            return;
        void load();
    }, [open, sessionId, load]);
    if (!open)
        return null;
    return (_jsx(Modal, { open: open, title: "Detalle de turno", onClose: onClose, size: "xl", children: summary ? (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Badge, { variant: summary.status === 'open' ? 'success' : 'muted', children: summary.status === 'open' ? 'Caja abierta' : 'Caja cerrada' }), _jsxs("span", { className: "text-xs text-[rgb(var(--text-muted))]", children: [formatDateTime(summary.openedAt), summary.closedAt && ` → ${formatDateTime(summary.closedAt)}`, summary.openedByName && ` · ${summary.openedByName}`] })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: [_jsx(Stat, { label: "Apertura", amount: summary.openingAmount }), _jsx(Stat, { label: "Ventas efectivo", amount: summary.totalSalesGross }), _jsx(Stat, { label: "Ventas Yape", amount: summary.totalYapeGross }), _jsx(Stat, { label: "Devoluciones efectivo", amount: summary.totalReturns }), _jsx(Stat, { label: "Efectivo neto", amount: summary.totalSales }), _jsx(Stat, { label: "Ingresos manuales", amount: summary.totalIncome }), _jsx(Stat, { label: "Egresos manuales", amount: summary.totalExpense }), _jsx(Stat, { label: "Ganancia", amount: summary.salesProfit }), _jsx(Stat, { label: "Esperado en caja", amount: summary.expectedAmount ?? summary.expectedInDrawer }), _jsx(Stat, { label: "Diferencia", amount: summary.difference ?? 0, highlight: true })] }), summary.notes && (_jsx("p", { className: "rounded-lg bg-surface/80 px-3 py-2 text-sm", children: summary.notes })), onOpenTickets && sessionId && (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface/50 px-4 py-3", children: [_jsxs("span", { className: "text-sm text-[rgb(var(--text-muted))]", children: [ticketCount, " ticket(s) en este turno"] }), _jsx(Button, { variant: "secondary", type: "button", onClick: () => onOpenTickets(sessionId), children: "Ver tickets" })] })), _jsxs("div", { children: [_jsx("h4", { className: "mb-3 font-medium", children: "Movimientos manuales" }), _jsx("div", { className: "max-h-40 overflow-y-auto rounded-lg border border-surface-border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-surface-elevated", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left", children: "Tipo" }), _jsx("th", { className: "px-3 py-2 text-left", children: "Concepto" }), _jsx("th", { className: "px-3 py-2 text-right", children: "Monto" })] }) }), _jsx("tbody", { children: movements.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "px-3 py-4 text-center text-[rgb(var(--text-muted))]", children: "Sin movimientos manuales" }) })) : (movements.map((m) => (_jsxs("tr", { className: "border-t border-surface-border/60", children: [_jsx("td", { className: "px-3 py-2", children: _jsx(Badge, { variant: m.type === 'income' ? 'success' : 'warning', children: m.type === 'income' ? 'Ingreso' : 'Egreso' }) }), _jsx("td", { className: "px-3 py-2", children: m.concept }), _jsx("td", { className: "px-3 py-2 text-right", children: _jsx(MoneyDisplay, { amount: m.amount, size: "sm" }) })] }, m.id)))) })] }) })] })] })) : (_jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Cargando..." })) }));
}
function Stat({ label, amount, highlight }) {
    return (_jsxs("div", { className: "rounded-lg border border-surface-border p-3", children: [_jsx("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: label }), _jsx(MoneyDisplay, { amount: amount, size: "sm", className: highlight ? 'text-amber-600' : '' })] }));
}
