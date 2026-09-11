import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { roundMoney } from '@shared/lib/currency';
import { DOZEN_UNITS, isCajonEnabled, isDozenEnabled, isPlanchaEnabled, maxPacksForStock, packSalePrice, unitsPerPackForChoice } from '@shared/lib/product-packs';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { MoneyInput } from '../../components/ui/MoneyInput';
export function QuantityModal({ open, product, onClose, onConfirm }) {
    const [qty, setQty] = useState(1);
    const [qtyText, setQtyText] = useState('1');
    const [priceChoice, setPriceChoice] = useState('retail');
    const [manualPrice, setManualPrice] = useState(0);
    const inputRef = useRef(null);
    const hasWholesale = product != null && product.priceWholesale != null && product.priceWholesale > 0;
    const hasDozen = product != null && isDozenEnabled(product);
    const hasPlancha = product != null && isPlanchaEnabled(product);
    const hasCajon = product != null && isCajonEnabled(product);
    const unitsPerPack = product ? unitsPerPackForChoice(priceChoice, product) : 1;
    const maxQty = product ? maxPacksForStock(product.stock, unitsPerPack) : 0;
    function applyQty(next) {
        const clamped = Math.min(maxQty, Math.max(1, next));
        setQty(clamped);
        setQtyText(String(clamped));
    }
    useEffect(() => {
        if (open && product) {
            setQty(1);
            setQtyText('1');
            setPriceChoice('retail');
            setManualPrice(product.priceRetail);
            setTimeout(() => inputRef.current?.select(), 50);
        }
    }, [open, product?.id]);
    useEffect(() => {
        if (!open || !product)
            return;
        if (qty <= maxQty)
            return;
        const next = maxQty > 0 ? maxQty : 1;
        setQty(next);
        setQtyText(String(next));
    }, [open, product, priceChoice, maxQty, qty]);
    function commitQty() {
        if (!product)
            return;
        const trimmed = qtyText.trim();
        if (trimmed === '') {
            applyQty(1);
            return;
        }
        const n = Number(trimmed);
        if (!Number.isFinite(n)) {
            setQtyText(String(qty));
            return;
        }
        applyQty(Math.floor(n));
    }
    if (!open || !product)
        return null;
    function resolveUnitPrice() {
        if (priceChoice === 'wholesale' && hasWholesale) {
            return roundMoney(product.priceWholesale);
        }
        if (priceChoice === 'dozen' && hasDozen) {
            return packSalePrice(product.priceDozen, DOZEN_UNITS);
        }
        if (priceChoice === 'plancha' && hasPlancha) {
            return packSalePrice(product.pricePlancha, product.planchaQty ?? 0);
        }
        if (priceChoice === 'cajon' && hasCajon) {
            return packSalePrice(product.priceCajon, product.cajonQty ?? 0);
        }
        if (priceChoice === 'manual')
            return roundMoney(manualPrice);
        return roundMoney(product.priceRetail);
    }
    function resolvePriceLabel() {
        if (priceChoice === 'wholesale')
            return 'Mayor';
        if (priceChoice === 'dozen')
            return `Docena · ${DOZEN_UNITS} und.`;
        if (priceChoice === 'plancha')
            return `Plancha · ${product.planchaQty} und.`;
        if (priceChoice === 'cajon')
            return `Cajón · ${product.cajonQty} und.`;
        if (priceChoice === 'manual')
            return 'Manual';
        return 'Menor';
    }
    const unitPrice = resolveUnitPrice();
    function handleSubmit(e) {
        e.preventDefault();
        if (qty <= 0 || maxQty <= 0 || qty > maxQty)
            return;
        if (unitPrice <= 0)
            return;
        onConfirm(qty, unitPrice, resolvePriceLabel(), unitsPerPack);
        onClose();
    }
    function selectChoice(choice) {
        setPriceChoice(choice);
    }
    return (_jsx(Modal, { open: open, title: product.name, onClose: onClose, size: "md", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", type: "button", onClick: onClose, children: "Cancelar" }), _jsx(Button, { type: "submit", form: "qty-form", disabled: unitPrice <= 0 || maxQty <= 0, children: "Agregar" })] }), children: _jsxs("form", { id: "qty-form", onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "text-[rgb(var(--text-muted))]", children: "Stock disponible" }), _jsx("span", { className: "font-semibold tabular-nums", children: product.stock })] }), _jsxs("fieldset", { className: "space-y-2", children: [_jsx("legend", { className: "text-sm font-medium", children: "Precio de venta" }), _jsx(PriceOption, { checked: priceChoice === 'retail', onChange: () => selectChoice('retail'), label: "Precio menor", amount: product.priceRetail }), hasWholesale && (_jsx(PriceOption, { checked: priceChoice === 'wholesale', onChange: () => selectChoice('wholesale'), label: "Precio por mayor", amount: product.priceWholesale })), hasDozen && (_jsx(PriceOption, { checked: priceChoice === 'dozen', onChange: () => selectChoice('dozen'), label: `Docena (${DOZEN_UNITS} und.)`, amount: packSalePrice(product.priceDozen, DOZEN_UNITS), unitAmount: product.priceDozen, disabled: maxPacksForStock(product.stock, DOZEN_UNITS) <= 0 })), hasPlancha && (_jsx(PriceOption, { checked: priceChoice === 'plancha', onChange: () => selectChoice('plancha'), label: `Plancha (${product.planchaQty} und.)`, amount: packSalePrice(product.pricePlancha, product.planchaQty ?? 0), unitAmount: product.pricePlancha, disabled: maxPacksForStock(product.stock, product.planchaQty ?? 0) <= 0 })), hasCajon && (_jsx(PriceOption, { checked: priceChoice === 'cajon', onChange: () => selectChoice('cajon'), label: `Cajón (${product.cajonQty} und.)`, amount: packSalePrice(product.priceCajon, product.cajonQty ?? 0), unitAmount: product.priceCajon, disabled: maxPacksForStock(product.stock, product.cajonQty ?? 0) <= 0 })), _jsxs("label", { className: "flex cursor-pointer items-start gap-2 rounded-lg border border-surface-border px-3 py-2 hover:bg-surface-elevated", children: [_jsx("input", { type: "radio", name: "priceChoice", checked: priceChoice === 'manual', onChange: () => selectChoice('manual'), className: "mt-1" }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx("span", { className: "text-sm", children: "Precio manual" }), priceChoice === 'manual' && (_jsx(MoneyInput, { label: "", value: manualPrice, onChange: setManualPrice }))] })] })] }), _jsxs("label", { className: "flex flex-col gap-2", children: [_jsx("span", { className: "text-sm font-medium", children: unitsPerPack > 1 ? 'Cantidad de empaques' : 'Cantidad' }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => applyQty(qty - 1), children: "\u2212" }), _jsx("input", { ref: inputRef, type: "text", inputMode: "numeric", value: qtyText, onChange: (e) => setQtyText(e.target.value), onBlur: commitQty, onKeyDown: (e) => {
                                        if (e.key === 'Enter')
                                            e.currentTarget.blur();
                                    }, className: "w-full rounded-lg border border-surface-border bg-surface-elevated px-4 py-3 text-center text-2xl font-semibold tabular-nums focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => applyQty(qty + 1), children: "+" })] }), unitsPerPack > 1 && (_jsxs("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: ["Se descontar\u00E1n ", qty * unitsPerPack, " unidades del stock", maxQty > 0 ? ` (máx. ${maxQty} empaques)` : ''] }))] }), _jsxs("div", { className: "rounded-lg bg-brand/5 px-3 py-2 text-center", children: [_jsxs("span", { className: "text-sm text-[rgb(var(--text-muted))]", children: ["Subtotal (", resolvePriceLabel(), "):", ' '] }), _jsx(MoneyDisplay, { amount: unitPrice * qty, size: "lg" })] })] }) }));
}
function PriceOption({ checked, onChange, label, amount, unitAmount, disabled }) {
    return (_jsxs("label", { className: [
            'flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-surface-elevated'
        ].join(' '), children: [_jsx("input", { type: "radio", name: "priceChoice", checked: checked, onChange: onChange, disabled: disabled }), _jsx("span", { className: "flex-1 text-sm", children: label }), _jsxs("span", { className: "text-right", children: [_jsx(MoneyDisplay, { amount: amount, size: "sm" }), unitAmount != null && unitAmount > 0 && (_jsxs("span", { className: "block text-[11px] text-[rgb(var(--text-muted))]", children: [_jsx(MoneyDisplay, { amount: unitAmount, size: "sm", className: "inline text-[11px]" }), " c/u"] }))] })] }));
}
