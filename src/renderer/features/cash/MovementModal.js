import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { useCashStore } from '../../stores/cash.store';
export function MovementModal({ open, type, onClose, onSaved }) {
    const [amount, setAmount] = useState(0);
    const [concept, setConcept] = useState('');
    const [reference, setReference] = useState('');
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const refresh = useCashStore((s) => s.refresh);
    const title = type === 'income' ? 'Registrar ingreso' : 'Registrar egreso';
    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const result = await window.api.cash.addMovement({
            type,
            amount,
            concept,
            reference: reference || null
        });
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        await refresh();
        onSaved();
        onClose();
        setConcept('');
        setReference('');
        setAmount(0);
    }
    return (_jsx(Modal, { open: open, title: title, onClose: onClose, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", type: "button", onClick: onClose, children: "Cancelar" }), _jsx(Button, { type: "submit", form: "movement-form", disabled: saving, children: saving ? 'Guardando...' : 'Guardar' })] }), children: _jsxs("form", { id: "movement-form", onSubmit: (e) => void handleSubmit(e), className: "space-y-4", children: [_jsx(MoneyInput, { label: "Monto", value: amount, onChange: setAmount, required: true }), _jsx(Input, { label: "Concepto", value: concept, onChange: (e) => setConcept(e.target.value), required: true, autoFocus: true }), _jsx(Input, { label: "Referencia (opcional)", value: reference, onChange: (e) => setReference(e.target.value) }), error && _jsx("p", { className: "text-sm text-red-500", children: error })] }) }));
}
