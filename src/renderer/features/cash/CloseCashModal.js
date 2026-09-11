import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { useCashStore } from '../../stores/cash.store';
export function CloseCashModal({ open, summary, onClose }) {
    const [closingAmount, setClosingAmount] = useState(summary.expectedInDrawer);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (open)
            setClosingAmount(summary.expectedInDrawer);
    }, [open, summary.expectedInDrawer]);
    const difference = closingAmount - summary.expectedInDrawer;
    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const result = await window.api.cash.close({ closingAmount, notes: notes || null });
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        useCashStore.getState().setCurrent(null);
        onClose();
        void useCashStore.getState().refresh();
    }
    return (_jsx(Modal, { open: open, title: "Cerrar caja", onClose: onClose, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", type: "button", onClick: onClose, children: "Cancelar" }), _jsx(Button, { type: "submit", form: "close-cash-form", disabled: saving, children: saving ? 'Cerrando...' : 'Cerrar caja' })] }), children: _jsxs("form", { id: "close-cash-form", onSubmit: (e) => void handleSubmit(e), className: "space-y-4", children: [_jsxs("div", { className: "rounded-lg border border-surface-border bg-surface/50 p-4 text-sm", children: [_jsxs("div", { className: "flex justify-between py-1", children: [_jsx("span", { className: "text-[rgb(var(--text-muted))]", children: "Esperado en caja" }), _jsx(MoneyDisplay, { amount: summary.expectedInDrawer })] }), _jsxs("div", { className: "flex justify-between py-1", children: [_jsx("span", { className: "text-[rgb(var(--text-muted))]", children: "+ Ventas en efectivo" }), _jsx(MoneyDisplay, { amount: summary.totalSalesGross, size: "sm" })] }), summary.totalReturns > 0 && (_jsxs("div", { className: "flex justify-between py-1 text-amber-600", children: [_jsx("span", { children: "\u2212 Devoluciones efectivo" }), _jsx(MoneyDisplay, { amount: summary.totalReturns, size: "sm" })] })), _jsxs("div", { className: "flex justify-between py-1", children: [_jsx("span", { className: "text-[rgb(var(--text-muted))]", children: "= Efectivo neto en caja" }), _jsx(MoneyDisplay, { amount: summary.totalSales, size: "sm" })] }), (summary.totalYapeGross > 0 || summary.totalYape > 0) && (_jsxs("div", { className: "flex justify-between py-1 text-fuchsia-700 dark:text-fuchsia-300", children: [_jsx("span", { children: "Yape (no entra al caj\u00F3n)" }), _jsx(MoneyDisplay, { amount: summary.totalYape, size: "sm" })] })), _jsxs("div", { className: "flex justify-between py-1", children: [_jsx("span", { className: "text-[rgb(var(--text-muted))]", children: "Ganancia ventas" }), _jsx(MoneyDisplay, { amount: summary.salesProfit, size: "sm" })] })] }), _jsx(MoneyInput, { label: "Efectivo contado al cierre", value: closingAmount, onChange: setClosingAmount, required: true }), _jsxs("div", { className: [
                        'rounded-lg px-3 py-2 text-sm',
                        Math.abs(difference) < 0.01
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    ].join(' '), children: ["Diferencia: ", _jsx(MoneyDisplay, { amount: difference, size: "sm", className: "inline" })] }), _jsxs("label", { className: "flex flex-col gap-1.5 text-sm", children: [_jsx("span", { className: "font-medium", children: "Notas (opcional)" }), _jsx("textarea", { value: notes, onChange: (e) => setNotes(e.target.value), rows: 2, className: "rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" })] }), error && _jsx("p", { className: "text-sm text-red-500", children: error })] }) }));
}
