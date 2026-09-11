import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { formatDateTime } from '../../lib/datetime';
export function VoidSaleModal({ open, sale, onClose, onConfirm }) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (open) {
            setReason('');
            setError(null);
        }
    }, [open, sale?.id]);
    async function handleSubmit(e) {
        e.preventDefault();
        const trimmed = reason.trim();
        if (!trimmed) {
            setError('El motivo de anulación es obligatorio');
            return;
        }
        if (!confirm(`¿Anular la venta ${sale?.ticketNumber}?\n\nSe restaurará el stock de los productos no devueltos. Esta acción no se puede deshacer.`)) {
            return;
        }
        setSaving(true);
        setError(null);
        await onConfirm(trimmed);
        setSaving(false);
    }
    return (_jsx(Modal, { open: open, title: "Anular venta", onClose: onClose, size: "md", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", type: "button", onClick: onClose, disabled: saving, children: "Cancelar" }), _jsx(Button, { type: "submit", form: "void-sale-form", variant: "danger", disabled: saving, children: saving ? 'Anulando...' : 'Anular venta' })] }), children: sale && (_jsxs("form", { id: "void-sale-form", onSubmit: (e) => void handleSubmit(e), className: "space-y-4", children: [_jsxs("div", { className: "rounded-lg border border-surface-border bg-surface/50 p-3 text-sm", children: [_jsxs("p", { children: [_jsx("span", { className: "text-[rgb(var(--text-muted))]", children: "Ticket:" }), ' ', _jsx("span", { className: "font-mono font-medium", children: sale.ticketNumber })] }), _jsxs("p", { className: "mt-1", children: [_jsx("span", { className: "text-[rgb(var(--text-muted))]", children: "Fecha venta:" }), ' ', formatDateTime(sale.createdAt)] }), _jsxs("p", { className: "mt-1", children: [_jsx("span", { className: "text-[rgb(var(--text-muted))]", children: "Total:" }), ' ', _jsx(MoneyDisplay, { amount: sale.total, size: "sm", className: "inline" })] })] }), _jsxs("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: ["La venta pasar\u00E1 a estado ", _jsx("strong", { children: "ANULADA" }), " y dejar\u00E1 de contar en ingresos y ganancias."] }), _jsx(Input, { label: "Motivo de anulaci\u00F3n", value: reason, onChange: (e) => setReason(e.target.value), placeholder: "Ej. error de cobro, cliente cancel\u00F3...", required: true, autoFocus: true }), error && _jsx("p", { className: "text-sm text-red-500", children: error })] })) }));
}
