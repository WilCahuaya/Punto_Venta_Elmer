import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { formatDateTime } from '../../lib/datetime';
export function ReturnSaleModal({ open, sale, onClose, onSaved }) {
    const [detail, setDetail] = useState(null);
    const [quantities, setQuantities] = useState({});
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!open || !sale) {
            setDetail(null);
            return;
        }
        setLoading(true);
        setReason('');
        setError(null);
        void window.api.sales.getDetail(sale.id).then((res) => {
            setLoading(false);
            if (!res.ok) {
                setError(res.error);
                setDetail(null);
                return;
            }
            setDetail(res.data);
            const initial = {};
            for (const item of res.data.items) {
                initial[item.id] = '';
            }
            setQuantities(initial);
        });
    }, [open, sale?.id]);
    const returnableItems = detail?.items.filter((i) => i.returnableQuantity > 0) ?? [];
    async function handleSubmit(e) {
        e.preventDefault();
        if (!sale || !detail)
            return;
        const items = returnableItems
            .map((item) => ({
            saleItemId: item.id,
            quantity: Number(quantities[item.id] ?? 0)
        }))
            .filter((l) => l.quantity > 0);
        if (items.length === 0) {
            setError('Indique la cantidad a devolver de al menos un producto');
            return;
        }
        setSaving(true);
        setError(null);
        const result = await window.api.sales.partialReturn({
            saleId: sale.id,
            reason: reason.trim(),
            items
        });
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        onSaved();
        onClose();
    }
    return (_jsx(Modal, { open: open, title: "Devolver productos", onClose: onClose, size: "lg", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", type: "button", onClick: onClose, disabled: saving, children: "Cancelar" }), _jsx(Button, { type: "submit", form: "return-sale-form", disabled: saving || loading || returnableItems.length === 0, children: saving ? 'Guardando...' : 'Registrar devolución' })] }), children: sale && (_jsxs("form", { id: "return-sale-form", onSubmit: (e) => void handleSubmit(e), className: "space-y-4", children: [_jsxs("div", { className: "rounded-lg border border-surface-border bg-surface/50 p-3 text-sm", children: [_jsxs("p", { children: ["Ticket ", _jsx("span", { className: "font-mono font-medium", children: sale.ticketNumber }), " \u00B7", ' ', formatDateTime(sale.createdAt)] }), _jsxs("p", { className: "mt-1 text-[rgb(var(--text-muted))]", children: ["La venta sigue ", _jsx("strong", { children: "COMPLETADA" }), ". Solo se devuelve stock y se ajustan los totales en reportes."] }), detail?.isCredit && (_jsx("p", { className: "mt-2 text-amber-700 dark:text-amber-300", children: "En un fiado, la devoluci\u00F3n baja el saldo. Si ya se cobr\u00F3 de m\u00E1s, el excedente se registra en la caja abierta." })), detail?.paymentMethod === 'yape' && !detail.isCredit && (_jsx("p", { className: "mt-2 text-fuchsia-700 dark:text-fuchsia-300", children: "Esta venta fue por Yape. El reembolso no sale del caj\u00F3n de efectivo." }))] }), loading && (_jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Cargando productos..." })), !loading && returnableItems.length === 0 && (_jsx("p", { className: "text-sm text-amber-600", children: "No hay productos pendientes de devolver en esta venta." })), !loading && returnableItems.length > 0 && (_jsx("div", { className: "overflow-hidden rounded-lg border border-surface-border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-surface-elevated", children: _jsxs("tr", { className: "border-b border-surface-border text-left", children: [_jsx("th", { className: "px-3 py-2 font-medium", children: "Producto" }), _jsx("th", { className: "px-3 py-2 font-medium text-center", children: "Vendido" }), _jsx("th", { className: "px-3 py-2 font-medium text-center", children: "Ya devuelto" }), _jsx("th", { className: "px-3 py-2 font-medium text-center", children: "A devolver" })] }) }), _jsx("tbody", { children: returnableItems.map((item) => (_jsxs("tr", { className: "border-b border-surface-border/50", children: [_jsx("td", { className: "px-3 py-2", children: item.productName }), _jsx("td", { className: "px-3 py-2 text-center tabular-nums", children: item.quantity }), _jsx("td", { className: "px-3 py-2 text-center tabular-nums text-amber-600", children: item.returnedQuantity }), _jsx("td", { className: "px-3 py-2", children: _jsx("input", { type: "number", min: 0, max: item.returnableQuantity, step: "any", value: quantities[item.id] ?? '', onChange: (e) => setQuantities((q) => ({ ...q, [item.id]: e.target.value })), placeholder: "0", className: "w-full rounded border border-surface-border bg-surface-elevated px-2 py-1 text-center tabular-nums" }) })] }, item.id))) })] }) })), _jsx(Input, { label: "Motivo de la devoluci\u00F3n", value: reason, onChange: (e) => setReason(e.target.value), placeholder: "Ej. producto defectuoso, cambio de talla...", required: true }), error && _jsx("p", { className: "text-sm text-red-500", children: error })] })) }));
}
