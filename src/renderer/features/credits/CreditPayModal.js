import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { roundMoney } from '@shared/lib/currency';
import { paymentMethodLabel } from '@shared/lib/payment';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { useCashStore } from '../../stores/cash.store';
export function CreditPayModal({ open, entry, onClose, onPaid }) {
    const isOpen = useCashStore((s) => s.isOpen);
    const [amount, setAmount] = useState(0);
    const [method, setMethod] = useState('cash');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (open && entry) {
            setAmount(entry.remaining);
            setMethod('cash');
            setError(null);
            setSaving(false);
        }
    }, [open, entry]);
    async function handleSubmit(e) {
        e.preventDefault();
        if (!entry)
            return;
        if (!isOpen) {
            setError('Abra la caja para registrar el abono');
            return;
        }
        const paid = roundMoney(amount);
        if (paid <= 0) {
            setError('El monto debe ser mayor a cero');
            return;
        }
        if (paid > entry.remaining + 0.004) {
            setError('El abono no puede ser mayor al saldo');
            return;
        }
        setSaving(true);
        setError(null);
        const res = await window.api.sales.payCredit({
            saleId: entry.id,
            amount: paid,
            paymentMethod: method
        });
        setSaving(false);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        onPaid(res.data);
    }
    return (_jsx(Modal, { open: open, title: entry ? `Cobrar fiado ${entry.ticketNumber}` : 'Cobrar fiado', onClose: onClose, size: "md", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", type: "button", onClick: onClose, disabled: saving, children: "Cancelar" }), _jsx(Button, { type: "submit", form: "credit-pay-form", disabled: saving || !isOpen || !entry, children: saving ? 'Registrando...' : 'Registrar abono' })] }), children: entry && (_jsxs("form", { id: "credit-pay-form", onSubmit: (e) => void handleSubmit(e), className: "space-y-4", children: [_jsxs("div", { className: "rounded-lg border border-surface-border p-3 text-sm", children: [_jsx("p", { className: "font-medium", children: entry.creditTo }), _jsxs("p", { className: "mt-1 text-[rgb(var(--text-muted))]", children: ["Ticket ", entry.ticketNumber] }), _jsxs("div", { className: "mt-2 flex justify-between", children: [_jsx("span", { children: "Saldo" }), _jsx(MoneyDisplay, { amount: entry.remaining, size: "sm", className: "font-semibold" })] })] }), !isOpen && (_jsxs("p", { className: "rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300", children: ["La caja est\u00E1 cerrada.", ' ', _jsx(Link, { to: "/cash", className: "font-medium underline", children: "Abrir caja" })] })), _jsxs("div", { children: [_jsx("p", { className: "mb-2 text-sm font-medium", children: "M\u00E9todo" }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx("button", { type: "button", onClick: () => setMethod('cash'), className: [
                                        'rounded-xl border px-3 py-2 text-left text-sm',
                                        method === 'cash'
                                            ? 'border-brand bg-brand/10 ring-2 ring-brand/40'
                                            : 'border-surface-border'
                                    ].join(' '), children: "Efectivo" }), _jsx("button", { type: "button", onClick: () => setMethod('yape'), className: [
                                        'rounded-xl border px-3 py-2 text-left text-sm',
                                        method === 'yape'
                                            ? 'border-fuchsia-500 bg-fuchsia-500/10 ring-2 ring-fuchsia-500/40'
                                            : 'border-surface-border'
                                    ].join(' '), children: "Yape" })] }), method === 'yape' && (_jsx("p", { className: "mt-2 text-xs text-[rgb(var(--text-muted))]", children: "El Yape no entra al efectivo del caj\u00F3n." }))] }), _jsx(MoneyInput, { label: "Monto a cobrar", value: amount, onChange: setAmount, required: true }), _jsxs(Button, { type: "button", variant: "ghost", onClick: () => setAmount(entry.remaining), children: ["Saldo exacto (", paymentMethodLabel(method), ")"] }), error && _jsx("p", { className: "text-sm text-red-500", children: error })] })) }));
}
