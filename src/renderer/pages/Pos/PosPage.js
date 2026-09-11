import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { productToPosProduct } from '@shared/types/sales';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { PaymentModal } from '../../features/pos/PaymentModal';
import { PrintTicketPromptModal } from '../../features/pos/PrintTicketPromptModal';
import { QuantityModal } from '../../features/pos/QuantityModal';
import { ServiceModal } from '../../features/pos/ServiceModal';
import { playErrorSound, playScanSound, playSuccessSound } from '../../lib/sounds';
import { usePosStore } from '../../stores/pos.store';
import { useCashStore } from '../../stores/cash.store';
import { useSettingsStore } from '../../stores/settings.store';
export function PosPage() {
    const isOpen = useCashStore((s) => s.isOpen);
    const cashLoading = useCashStore((s) => s.loading);
    const refreshCash = useCashStore((s) => s.refresh);
    const soundsEnabled = useSettingsStore((s) => s.soundsEnabled);
    const lines = usePosStore((s) => s.lines);
    const discount = usePosStore((s) => s.discount);
    const addProduct = usePosStore((s) => s.addProduct);
    const addServiceLine = usePosStore((s) => s.addServiceLine);
    const updateQuantity = usePosStore((s) => s.updateQuantity);
    const removeLine = usePosStore((s) => s.removeLine);
    const clearCart = usePosStore((s) => s.clearCart);
    const getSubtotal = usePosStore((s) => s.getSubtotal);
    const getTotal = usePosStore((s) => s.getTotal);
    const toSaleItems = usePosStore((s) => s.toSaleItems);
    const barcodeRef = useRef(null);
    const searchRef = useRef(null);
    const [barcodeBuffer, setBarcodeBuffer] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [qtyProduct, setQtyProduct] = useState(null);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [serviceOpen, setServiceOpen] = useState(false);
    const [serviceProductId, setServiceProductId] = useState(null);
    const [statusMsg, setStatusMsg] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [printPrompt, setPrintPrompt] = useState(null);
    const subtotal = getSubtotal();
    const total = getTotal();
    const focusBarcode = useCallback(() => {
        barcodeRef.current?.focus();
    }, []);
    useEffect(() => {
        if (!successMsg)
            return;
        const timer = window.setTimeout(() => setSuccessMsg(null), 5000);
        return () => window.clearTimeout(timer);
    }, [successMsg]);
    useEffect(() => {
        if (!isOpen || qtyProduct || paymentOpen || serviceOpen || printPrompt)
            return;
        focusBarcode();
    }, [isOpen, focusBarcode, qtyProduct, paymentOpen, serviceOpen, printPrompt]);
    useEffect(() => {
        if (!isOpen)
            return;
        void window.api.products.getSystemServiceProduct().then((res) => {
            if (res.ok)
                setServiceProductId(res.data.productId);
        });
    }, [isOpen]);
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const t = setTimeout(async () => {
            setSearching(true);
            const res = await window.api.sales.searchProducts(searchQuery);
            if (res.ok)
                setSearchResults(res.data);
            setSearching(false);
        }, 150);
        return () => clearTimeout(t);
    }, [searchQuery]);
    async function resolveProduct(source, codeOrId) {
        setStatusMsg(null);
        let product = null;
        if (source === 'barcode') {
            const res = await window.api.sales.lookupBarcode(codeOrId);
            if (!res.ok) {
                setStatusMsg(res.error);
                if (soundsEnabled)
                    playErrorSound();
                return;
            }
            product = res.data;
        }
        else {
            const found = searchResults.find((p) => String(p.id) === codeOrId);
            if (found)
                product = found;
        }
        if (!product)
            return;
        if (product.stock <= 0) {
            setStatusMsg(`Sin stock: ${product.name}`);
            if (soundsEnabled)
                playErrorSound();
            return;
        }
        if (soundsEnabled)
            playScanSound();
        setQtyProduct(productToPosProduct(product));
    }
    function handleBarcodeKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const code = barcodeBuffer.trim();
            if (code)
                void resolveProduct('barcode', code);
            setBarcodeBuffer('');
        }
    }
    function handleServiceConfirm(description, amount) {
        if (serviceProductId == null) {
            setStatusMsg('Servicio no disponible. Reinicie la aplicación.');
            if (soundsEnabled)
                playErrorSound();
            return;
        }
        addServiceLine(serviceProductId, description, amount);
        if (soundsEnabled)
            playScanSound();
        focusBarcode();
    }
    function handleConfirmQty(quantity, unitPrice, priceLabel, unitsPerPack) {
        if (!qtyProduct)
            return;
        addProduct({
            id: qtyProduct.id,
            name: qtyProduct.name,
            barcode: qtyProduct.barcode,
            stock: qtyProduct.stock,
            costPrice: qtyProduct.costPrice
        }, quantity, unitPrice, priceLabel, unitsPerPack);
        setQtyProduct(null);
        focusBarcode();
    }
    async function handlePayment(payload) {
        const result = await window.api.sales.create({
            items: toSaleItems(),
            amountPaid: payload.amountPaid,
            discount,
            paymentMethod: payload.paymentMethod,
            isCredit: payload.isCredit,
            creditTo: payload.creditTo
        });
        if (!result.ok) {
            setStatusMsg(result.error);
            if (soundsEnabled)
                playErrorSound();
            return;
        }
        if (soundsEnabled)
            playSuccessSound();
        setStatusMsg(null);
        clearCart();
        setPaymentOpen(false);
        void refreshCash();
        setPrintPrompt({
            saleId: result.data.id,
            ticketNumber: result.data.ticketNumber
        });
    }
    async function handlePrintTicketConfirm(printerName) {
        if (!printPrompt)
            return;
        const { saleId, ticketNumber } = printPrompt;
        const printRes = await window.api.sales.printTicket(saleId, printerName);
        setPrintPrompt(null);
        setSuccessMsg(printRes.ok
            ? `¡Venta realizada exitosamente! · Ticket ${ticketNumber}`
            : `¡Venta realizada exitosamente! · Ticket ${ticketNumber} (sin imprimir: ${printRes.error})`);
        focusBarcode();
    }
    function handleSkipTicketPrint() {
        if (!printPrompt)
            return;
        const { ticketNumber } = printPrompt;
        setPrintPrompt(null);
        setSuccessMsg(`¡Venta realizada exitosamente! · Ticket ${ticketNumber} (sin imprimir)`);
        focusBarcode();
    }
    useEffect(() => {
        function onKeyDown(e) {
            if (e.key === 'F2') {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if (e.key === 'F4') {
                e.preventDefault();
                if (lines.length && confirm('¿Vaciar carrito?'))
                    clearCart();
            }
            if (e.key === 'F7') {
                e.preventDefault();
                setServiceOpen(true);
            }
            if (e.key === 'F12') {
                e.preventDefault();
                if (lines.length)
                    setPaymentOpen(true);
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [lines.length, clearCart]);
    if (cashLoading) {
        return (_jsx("div", { className: "flex h-full items-center justify-center text-[rgb(var(--text-muted))]", children: "Verificando caja..." }));
    }
    if (!isOpen) {
        return (_jsxs("div", { className: "flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-8 text-center", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Caja cerrada" }), _jsx("p", { className: "mt-2 max-w-md text-sm text-[rgb(var(--text-muted))]", children: "Abra la caja para vender." }), _jsx(Link, { to: "/cash", className: "mt-6", children: _jsx(Button, { children: "Ir a Caja" }) })] }));
    }
    return (_jsxs("div", { className: "relative flex h-[calc(100vh-3rem)] flex-col gap-4", children: [successMsg && (_jsx("div", { role: "status", className: "absolute right-0 top-0 z-50 max-w-md rounded-xl border border-emerald-500/40 bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg", children: successMsg })), _jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx("div", { className: "min-w-[280px] flex-1", children: _jsx("input", { ref: barcodeRef, type: "text", value: barcodeBuffer, onChange: (e) => setBarcodeBuffer(e.target.value), onKeyDown: handleBarcodeKeyDown, placeholder: "Escanee el c\u00F3digo de barras aqu\u00ED", autoComplete: "off", className: "w-full rounded-lg border-2 border-brand/40 bg-surface-elevated px-4 py-2.5 font-mono text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" }) }), statusMsg && (_jsx("span", { className: "ml-auto text-sm text-brand", children: statusMsg }))] }), _jsxs("div", { className: "grid min-h-0 flex-1 gap-4 lg:grid-cols-5", children: [_jsxs("div", { className: "flex flex-col gap-3 lg:col-span-2", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => setServiceOpen(true), children: "Servicio libre (F7)" }), _jsx(Input, { ref: searchRef, label: "B\u00FAsqueda manual", placeholder: "Nombre o c\u00F3digo...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), onKeyDown: (e) => {
                                    if (e.key === 'ArrowDown' && searchResults[0]) {
                                        e.preventDefault();
                                        void resolveProduct('search', String(searchResults[0].id));
                                    }
                                } }), _jsx("div", { className: "min-h-0 flex-1 overflow-y-auto rounded-xl border border-surface-border", children: searching ? (_jsx("p", { className: "p-4 text-sm text-[rgb(var(--text-muted))]", children: "Buscando..." })) : searchResults.length === 0 ? (_jsx("p", { className: "p-4 text-sm text-[rgb(var(--text-muted))]", children: searchQuery ? 'Sin resultados' : 'Escriba para buscar o use el escáner' })) : (_jsx("ul", { children: searchResults.map((p) => (_jsx("li", { children: _jsxs("button", { type: "button", className: "flex w-full items-center justify-between gap-2 border-b border-surface-border/50 px-3 py-2.5 text-left text-sm hover:bg-surface-elevated", onClick: () => void resolveProduct('search', String(p.id)), children: [_jsxs("span", { children: [_jsx("span", { className: "font-medium", children: p.name }), p.barcode && (_jsx("span", { className: "ml-2 font-mono text-xs text-[rgb(var(--text-muted))]", children: p.barcode }))] }), _jsxs("span", { className: "shrink-0 text-xs", children: ["Stock ", p.stock, " \u00B7 ", _jsx(MoneyDisplay, { amount: p.priceRetail, size: "sm" })] })] }) }, p.id))) })) })] }), _jsxs("div", { className: "flex min-h-0 flex-col lg:col-span-3", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsxs("h3", { className: "font-semibold", children: ["Carrito (", lines.length, ")"] }), lines.length > 0 && (_jsx(Button, { variant: "ghost", type: "button", onClick: () => clearCart(), children: "Vaciar" }))] }), _jsx("div", { className: "min-h-0 flex-1 overflow-y-auto rounded-xl border border-surface-border", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "sticky top-0 border-b border-surface-border bg-surface-elevated", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-2 text-left font-medium", children: "Producto" }), _jsx("th", { className: "px-3 py-2 text-center font-medium w-24", children: "Cant." }), _jsx("th", { className: "px-3 py-2 text-right font-medium", children: "P.unit" }), _jsx("th", { className: "px-3 py-2 text-right font-medium", children: "Total" }), _jsx("th", { className: "w-10" })] }) }), _jsx("tbody", { children: lines.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-4 py-12 text-center text-[rgb(var(--text-muted))]", children: "Escanee o busque un producto" }) })) : (lines.map((line) => (_jsxs("tr", { className: "border-b border-surface-border/50", children: [_jsxs("td", { className: "px-3 py-2", children: [_jsx("div", { className: "font-medium", children: line.name }), _jsxs("div", { className: "text-xs text-[rgb(var(--text-muted))]", children: [line.priceLabel, line.unitsPerPack > 1 && (_jsxs("span", { children: [" \u00B7 \u2212", line.quantity * line.unitsPerPack, " und."] })), line.barcode && (_jsx("span", { className: "ml-2 font-mono", children: line.barcode }))] })] }), _jsx("td", { className: "px-3 py-2 text-center tabular-nums", children: line.isService ? (_jsx("span", { className: "text-[rgb(var(--text-muted))]", children: "1" })) : (_jsx("input", { type: "number", min: 1, max: line.maxStock, value: line.quantity, onChange: (e) => updateQuantity(line.key, Number(e.target.value)), className: "w-full rounded border border-surface-border bg-surface px-2 py-1 text-center tabular-nums" })) }), _jsx("td", { className: "px-3 py-2 text-right", children: _jsx(MoneyDisplay, { amount: line.unitPrice, size: "sm" }) }), _jsx("td", { className: "px-3 py-2 text-right font-medium", children: _jsx(MoneyDisplay, { amount: line.lineTotal, size: "sm" }) }), _jsx("td", { className: "px-2 py-2", children: _jsx("button", { type: "button", className: "text-[rgb(var(--text-muted))] hover:text-red-500", onClick: () => removeLine(line.key), "aria-label": "Quitar", children: "\u2715" }) })] }, line.key)))) })] }) }), _jsxs("div", { className: "mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-surface-border pt-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex gap-6 text-sm", children: [_jsx("span", { className: "text-[rgb(var(--text-muted))]", children: "Subtotal" }), _jsx(MoneyDisplay, { amount: subtotal })] }), discount > 0 && (_jsxs("div", { className: "flex gap-6 text-sm text-amber-600", children: [_jsx("span", { children: "Descuento" }), _jsx(MoneyDisplay, { amount: discount, size: "sm" })] })), _jsxs("div", { className: "flex gap-6 text-xl font-bold", children: [_jsx("span", { children: "TOTAL" }), _jsx(MoneyDisplay, { amount: total, size: "lg" })] })] }), _jsx(Button, { disabled: lines.length === 0, onClick: () => setPaymentOpen(true), className: "min-w-[160px] px-8 py-3 text-base", children: "Cobrar" })] })] })] }), _jsx(QuantityModal, { open: !!qtyProduct, product: qtyProduct, onClose: () => {
                    setQtyProduct(null);
                    focusBarcode();
                }, onConfirm: handleConfirmQty }), _jsx(ServiceModal, { open: serviceOpen, onClose: () => {
                    setServiceOpen(false);
                    focusBarcode();
                }, onConfirm: handleServiceConfirm }), _jsx(PaymentModal, { open: paymentOpen, subtotal: subtotal, discount: discount, total: total, onClose: () => setPaymentOpen(false), onConfirm: handlePayment }), _jsx(PrintTicketPromptModal, { open: !!printPrompt, saleId: printPrompt?.saleId ?? null, ticketNumber: printPrompt?.ticketNumber ?? '', onPrint: handlePrintTicketConfirm, onSkip: handleSkipTicketPrint })] }));
}
