import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
export function StockAdjustModal({ open, product, onClose, onSaved }) {
    const [stock, setStock] = useState(0);
    const [step, setStep] = useState('edit');
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const currentStock = product?.stock ?? 0;
    useEffect(() => {
        if (open && product) {
            setStock(product.stock);
            setStep('edit');
            setError(null);
        }
    }, [open, product]);
    function handleStockChange(raw) {
        const parsed = Number(raw);
        if (Number.isNaN(parsed)) {
            setStock(currentStock);
            return;
        }
        setStock(Math.max(currentStock, parsed));
        setError(null);
    }
    function handleRequestConfirm(e) {
        e.preventDefault();
        if (!product)
            return;
        if (stock < currentStock) {
            setError(`No puede ser menor al stock actual (${currentStock})`);
            setStock(currentStock);
            return;
        }
        if (stock === currentStock) {
            setError('El stock no cambió');
            return;
        }
        setError(null);
        setStep('confirm');
    }
    async function handleConfirmSave() {
        if (!product)
            return;
        setSaving(true);
        setError(null);
        const result = await window.api.products.adjustStock({
            productId: product.id,
            stock
        });
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            setStep('edit');
            return;
        }
        onSaved();
        onClose();
    }
    function handleBackToEdit() {
        setStep('edit');
        setError(null);
    }
    return (_jsxs(Modal, { open: open, title: step === 'edit' ? 'Ajustar stock' : 'Confirmar cambio de stock', onClose: onClose, size: "sm", footer: step === 'edit' ? (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", type: "button", onClick: onClose, children: "Cancelar" }), _jsx(Button, { type: "submit", form: "stock-adjust-form", disabled: !product, children: "Continuar" })] })) : (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", type: "button", onClick: handleBackToEdit, disabled: saving, children: "Volver" }), _jsx(Button, { type: "button", onClick: () => void handleConfirmSave(), disabled: saving || !product, children: saving ? 'Guardando...' : 'Sí, confirmar' })] })), children: [product && step === 'edit' && (_jsxs("form", { id: "stock-adjust-form", onSubmit: handleRequestConfirm, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: product.name }), product.barcode && (_jsx("p", { className: "font-mono text-xs text-[rgb(var(--text-muted))]", children: product.barcode })), product.productCode && (_jsxs("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: ["C\u00F3digo: ", product.productCode] }))] }), _jsxs("div", { className: "rounded-lg border border-surface-border bg-surface/60 px-3 py-2 text-sm", children: ["Stock actual: ", _jsx("span", { className: "font-semibold tabular-nums", children: currentStock })] }), _jsx(Input, { label: "Nuevo stock", type: "number", min: currentStock, step: "1", value: String(stock), onChange: (e) => handleStockChange(e.target.value), autoFocus: true }), _jsxs("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: ["Solo puede aumentar el stock. No se permite bajar por debajo de ", currentStock, "."] }), error && _jsx("p", { className: "text-sm text-red-500", children: error })] })), product && step === 'confirm' && (_jsxs("div", { className: "space-y-4 text-center", children: [_jsx("p", { className: "font-medium", children: product.name }), _jsxs("div", { className: "rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4", children: [_jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "\u00BFConfirma este cambio de stock?" }), _jsxs("p", { className: "mt-2 text-2xl font-bold tabular-nums", children: [currentStock, ' ', _jsx("span", { className: "text-base font-normal text-[rgb(var(--text-muted))]", children: "\u2192" }), " ", stock] }), _jsxs("p", { className: "mt-1 text-sm text-amber-700", children: ["+", stock - currentStock, " unidad", stock - currentStock === 1 ? '' : 'es'] })] }), error && _jsx("p", { className: "text-sm text-red-500", children: error })] }))] }));
}
