import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { useCashStore } from '../../stores/cash.store';
export function OpenCashModal({ open, onClose }) {
    const [amount, setAmount] = useState(0);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const refresh = useCashStore((s) => s.refresh);
    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const result = await window.api.cash.open({ openingAmount: amount });
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        useCashStore.getState().setCurrent(result.data);
        onClose();
        void refresh();
    }
    return (_jsx(Modal, { open: open, title: "Abrir caja", onClose: onClose, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", type: "button", onClick: onClose, children: "Cancelar" }), _jsx(Button, { type: "submit", form: "open-cash-form", disabled: saving, children: saving ? 'Abriendo...' : 'Abrir caja' })] }), children: _jsxs("form", { id: "open-cash-form", onSubmit: (e) => void handleSubmit(e), className: "space-y-4", children: [_jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Ingrese el monto inicial en efectivo con el que inicia el turno." }), _jsx(MoneyInput, { label: "Monto de apertura", value: amount, onChange: setAmount, required: true }), error && _jsx("p", { className: "text-sm text-red-500", children: error })] }) }));
}
