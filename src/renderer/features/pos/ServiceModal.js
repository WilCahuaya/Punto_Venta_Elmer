import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { MoneyInput } from '../../components/ui/MoneyInput';
export function ServiceModal({ open, onClose, onConfirm }) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState(0);
    const [error, setError] = useState(null);
    const nameRef = useRef(null);
    useEffect(() => {
        if (open) {
            setDescription('');
            setAmount(0);
            setError(null);
            setTimeout(() => nameRef.current?.focus(), 50);
        }
    }, [open]);
    function handleSubmit(e) {
        e.preventDefault();
        const name = description.trim();
        if (!name) {
            setError('Indique el nombre o descripción del servicio');
            return;
        }
        if (amount <= 0) {
            setError('El monto debe ser mayor a cero');
            return;
        }
        onConfirm(name, amount);
        onClose();
    }
    return (_jsx(Modal, { open: open, title: "Servicio libre", onClose: onClose, size: "md", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", type: "button", onClick: onClose, children: "Cancelar" }), _jsx(Button, { type: "submit", form: "service-form", children: "Agregar al carrito" })] }), children: _jsxs("form", { id: "service-form", onSubmit: handleSubmit, className: "space-y-4", children: [_jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Escriba qu\u00E9 est\u00E1 cobrando y el monto. Aparecer\u00E1 as\u00ED en el ticket y en reportes." }), _jsx(Input, { ref: nameRef, label: "Descripci\u00F3n del servicio", value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Ej. Recarga Claro, Copias, Plastificado...", required: true }), _jsx(MoneyInput, { label: "Monto a cobrar", value: amount, onChange: setAmount, required: true }), error && _jsx("p", { className: "text-sm text-red-500", children: error })] }) }));
}
