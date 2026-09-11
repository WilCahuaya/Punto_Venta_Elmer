import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { roundMoney } from '@shared/lib/currency';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { MoneyInput } from '../../components/ui/MoneyInput';
export function PaymentModal({ open, subtotal, discount, total, onClose, onConfirm }) {
    const [mode, setMode] = useState('cash');
    const [paid, setPaid] = useState(total);
    const [creditTo, setCreditTo] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (open) {
            setMode('cash');
            setPaid(total);
            setCreditTo('');
            setError(null);
            setSaving(false);
        }
    }, [open, total]);
    const isCredit = mode === 'credit';
    const paymentMethod = mode === 'yape' ? 'yape' : 'cash';
    const remaining = isCredit ? roundMoney(Math.max(0, total - paid)) : 0;
    const change = mode === 'cash' ? roundMoney(Math.max(0, paid - total)) : 0;
    const quickAmounts = [10, 20, 50, 100, 200].filter((bill) => bill > total);
    function selectMode(next) {
        setMode(next);
        setError(null);
        if (next === 'yape')
            setPaid(total);
        if (next === 'credit')
            setPaid(0);
        if (next === 'cash')
            setPaid(total);
    }
    async function handleSubmit(e) {
        e.preventDefault();
        if (isCredit) {
            if (!creditTo.trim()) {
                setError('Indique a quién se fía');
                return;
            }
            if (paid < 0) {
                setError('El adelanto no puede ser negativo');
                return;
            }
            if (paid >= total) {
                setError('Si cubre el total, use Efectivo o Yape');
                return;
            }
        }
        else if (mode === 'cash' && paid < total) {
            setError('El monto recibido es insuficiente');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onConfirm({
                amountPaid: isCredit ? paid : mode === 'yape' ? total : paid,
                paymentMethod,
                isCredit,
                creditTo: isCredit ? creditTo.trim() : undefined
            });
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsx(Modal, { open: open, title: "Cobrar", onClose: onClose, size: "md", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", type: "button", onClick: onClose, disabled: saving, children: "Cancelar" }), _jsx(Button, { type: "submit", form: "pay-form", disabled: saving, children: saving
                        ? 'Procesando...'
                        : isCredit
                            ? 'Registrar fiado'
                            : mode === 'yape'
                                ? 'Confirmar Yape'
                                : 'Confirmar venta' })] }), children: _jsxs("form", { id: "pay-form", onSubmit: (e) => void handleSubmit(e), className: "space-y-4", children: [_jsxs("div", { className: "space-y-2 rounded-lg border border-surface-border p-4 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "Subtotal" }), _jsx(MoneyDisplay, { amount: subtotal, size: "sm" })] }), discount > 0 && (_jsxs("div", { className: "flex justify-between text-amber-600", children: [_jsx("span", { children: "Descuento" }), _jsx(MoneyDisplay, { amount: discount, size: "sm" })] })), _jsxs("div", { className: "flex justify-between border-t border-surface-border pt-2 text-lg font-semibold", children: [_jsx("span", { children: "Total" }), _jsx(MoneyDisplay, { amount: total, size: "lg" })] })] }), _jsxs("div", { children: [_jsx("p", { className: "mb-2 text-sm font-medium", children: "M\u00E9todo de pago" }), _jsxs("div", { className: "grid grid-cols-3 gap-2", children: [_jsx(MethodButton, { selected: mode === 'cash', onClick: () => selectMode('cash'), title: "Efectivo", subtitle: "Billetes y vuelto" }), _jsx(MethodButton, { selected: mode === 'yape', onClick: () => selectMode('yape'), title: "Yape", subtitle: "Pago al celular", accent: "yape" }), _jsx(MethodButton, { selected: isCredit, onClick: () => selectMode('credit'), title: "Fiar", subtitle: "Paga despu\u00E9s", accent: "credit" })] })] }), mode === 'cash' && (_jsxs(_Fragment, { children: [_jsx(MoneyInput, { label: "Monto recibido", value: paid, onChange: setPaid, required: true }), _jsxs("div", { className: "rounded-lg bg-emerald-500/10 px-4 py-3 text-center", children: [_jsx("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: "Vuelto" }), _jsx(MoneyDisplay, { amount: change, size: "lg", className: "text-emerald-600" })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [quickAmounts.map((bill) => (_jsx(Button, { type: "button", variant: "secondary", onClick: () => setPaid(roundMoney(bill)), children: bill }, bill))), _jsx(Button, { type: "button", variant: "ghost", onClick: () => setPaid(total), children: "Exacto" })] })] })), mode === 'yape' && (_jsxs("div", { className: "rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-3 text-sm", children: [_jsx("p", { className: "font-medium text-fuchsia-800 dark:text-fuchsia-300", children: "Confirme el pago en el celular" }), _jsxs("p", { className: "mt-1 text-[rgb(var(--text-muted))]", children: ["El cliente debe haber enviado", ' ', _jsx(MoneyDisplay, { amount: total, size: "sm", className: "inline font-semibold" }), " por Yape. Este cobro no entra al efectivo de caja."] })] })), isCredit && (_jsxs(_Fragment, { children: [_jsxs("label", { className: "flex flex-col gap-1.5 text-sm", children: [_jsxs("span", { className: "font-medium text-[rgb(var(--text))]", children: ["A qui\u00E9n se f\u00EDa ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("textarea", { value: creditTo, onChange: (e) => setCreditTo(e.target.value), required: true, rows: 3, maxLength: 500, placeholder: "Nombre, tel\u00E9fono, nota\u2026 lo que necesite para reconocerlo", className: "rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5 text-[rgb(var(--text))] placeholder:text-[rgb(var(--text-muted))] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" })] }), _jsx(MoneyInput, { label: "Adelanto (opcional)", value: paid, onChange: setPaid }), _jsx("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: "Puede ser 0. El adelanto entra a la caja de este turno." }), _jsxs("div", { className: "rounded-lg bg-amber-500/10 px-4 py-3 text-center", children: [_jsx("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: "Queda debiendo" }), _jsx(MoneyDisplay, { amount: remaining, size: "lg", className: "text-amber-700 dark:text-amber-400" })] })] })), error && _jsx("p", { className: "text-sm text-red-500", children: error })] }) }));
}
function MethodButton({ selected, onClick, title, subtitle, accent = 'cash' }) {
    const selectedClass = accent === 'yape'
        ? 'border-fuchsia-500 bg-fuchsia-500/10 ring-2 ring-fuchsia-500/40'
        : accent === 'credit'
            ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40'
            : 'border-brand bg-brand/10 ring-2 ring-brand/40';
    return (_jsxs("button", { type: "button", onClick: onClick, "aria-pressed": selected, className: [
            'rounded-xl border px-3 py-3 text-left transition-colors',
            selected
                ? selectedClass
                : 'border-surface-border bg-surface-elevated hover:bg-surface-border/30'
        ].join(' '), children: [_jsx("span", { className: "block text-sm font-semibold", children: title }), _jsx("span", { className: "mt-0.5 block text-xs text-[rgb(var(--text-muted))]", children: subtitle })] }));
}
