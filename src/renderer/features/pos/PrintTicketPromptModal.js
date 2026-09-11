import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { Select } from '../../components/ui/Select';
import { useLogoImage } from '../../hooks/useLogoImage';
import { useSettingsStore } from '../../stores/settings.store';
import { paymentMethodLabel } from '@shared/lib/payment';
function TicketRow({ label, children, strong }) {
    return (_jsxs("div", { className: [
            'flex items-baseline justify-between gap-3',
            strong ? 'text-sm font-bold' : ''
        ].join(' '), children: [_jsx("span", { children: label }), _jsx("span", { className: "text-right tabular-nums", children: children })] }));
}
export function PrintTicketPromptModal({ open, saleId, ticketNumber, onPrint, onSkip }) {
    const companyName = useSettingsStore((s) => s.companyName);
    const companyAddress = useSettingsStore((s) => s.companyAddress);
    const companyLogoPath = useSettingsStore((s) => s.companyLogoPath);
    const ticketLogoWidthPercent = useSettingsStore((s) => s.ticketLogoWidthPercent);
    const ticketSlogan = useSettingsStore((s) => s.ticketSlogan);
    const printerPaperWidth = useSettingsStore((s) => s.printerPaperWidth);
    const defaultPrinter = useSettingsStore((s) => s.printerTicket);
    const logoUrl = useLogoImage(companyLogoPath);
    const [printing, setPrinting] = useState(false);
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState(null);
    const [printers, setPrinters] = useState([]);
    const [printerName, setPrinterName] = useState('');
    const [loadError, setLoadError] = useState(null);
    const previewMaxWidth = printerPaperWidth === '80mm' ? 340 : 280;
    useEffect(() => {
        if (!open || saleId == null) {
            setDetail(null);
            setLoadError(null);
            setPrinting(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        setPrinting(false);
        void (async () => {
            const [detailRes, printersRes] = await Promise.all([
                window.api.sales.getDetail(saleId),
                window.api.settings.listPrinters()
            ]);
            if (cancelled)
                return;
            if (!detailRes.ok) {
                setDetail(null);
                setLoadError(detailRes.error);
            }
            else {
                setDetail(detailRes.data);
            }
            const list = printersRes.ok ? printersRes.data : [];
            setPrinters(list);
            const preferred = list.find((p) => p.name === defaultPrinter)?.name ??
                list.find((p) => p.isDefault)?.name ??
                list[0]?.name ??
                defaultPrinter ??
                '';
            setPrinterName(preferred);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [open, saleId, defaultPrinter]);
    const printerOptions = useMemo(() => printers.map((p) => ({
        value: p.name,
        label: p.isDefault ? `${p.displayName} (predeterminada)` : p.displayName
    })), [printers]);
    async function handlePrint() {
        if (!printerName.trim()) {
            setLoadError('Seleccione una impresora');
            return;
        }
        setPrinting(true);
        setLoadError(null);
        try {
            await onPrint(printerName.trim());
        }
        finally {
            setPrinting(false);
        }
    }
    return (_jsx(Modal, { open: open, title: "\u00BFImprimir ticket?", onClose: onSkip, size: "md", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", type: "button", disabled: printing, onClick: onSkip, children: "No imprimir" }), _jsx(Button, { type: "button", disabled: printing || loading || !printerName, onClick: () => void handlePrint(), children: printing ? 'Imprimiendo...' : 'Imprimir ticket' })] }), children: _jsxs("div", { className: "space-y-4", children: [_jsxs("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: ["Venta ", _jsx("strong", { className: "text-[rgb(var(--text))]", children: ticketNumber }), " registrada. Revise la vista previa y elija la impresora."] }), _jsx(Select, { label: "Impresora", value: printerName, onChange: setPrinterName, options: printerOptions.length
                        ? printerOptions
                        : [{ value: '', label: 'Sin impresoras detectadas' }], placeholder: "Seleccione impresora" }), loadError && (_jsx("p", { className: "rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600", children: loadError })), _jsx("div", { className: "rounded-xl border border-dashed border-surface-border bg-white px-3 py-3 text-black shadow-inner", children: loading || !detail ? (_jsx("p", { className: "text-center text-sm text-neutral-500", children: loading ? 'Cargando vista previa...' : 'Sin datos del ticket' })) : (_jsxs("div", { className: "mx-auto w-full font-mono text-[11px] leading-snug", style: { maxWidth: previewMaxWidth }, children: [logoUrl ? (_jsx("div", { className: "mb-2 flex justify-center", children: _jsx("img", { src: logoUrl, alt: "Logo", className: "h-auto object-contain", style: {
                                        width: `${Math.min(100, Math.max(40, ticketLogoWidthPercent || 65))}%`
                                    } }) })) : null, _jsx("p", { className: "text-center text-sm font-bold", children: companyName || 'Punto de Venta' }), companyAddress ? (_jsx("p", { className: "mt-0.5 text-center text-[10px] text-neutral-600", children: companyAddress })) : null, _jsx("hr", { className: "my-2 border-neutral-400" }), _jsx(TicketRow, { label: "Ticket", children: detail.ticketNumber }), _jsx(TicketRow, { label: "Fecha", children: detail.createdAt.replace('T', ' ').slice(0, 19) }), _jsx("hr", { className: "my-2 border-neutral-400" }), _jsx("ul", { className: "space-y-1.5", children: detail.items.map((item) => (_jsxs("li", { children: [_jsx("p", { className: "font-semibold", children: item.productName }), _jsxs("div", { className: "flex justify-between gap-2 text-neutral-700", children: [_jsxs("span", { children: [item.quantity, " \u00D7 ", _jsx(MoneyDisplay, { amount: item.unitPrice, size: "sm" })] }), _jsx(MoneyDisplay, { amount: item.lineTotal, size: "sm" })] })] }, item.id))) }), _jsx("hr", { className: "my-2 border-neutral-400" }), _jsx(TicketRow, { label: "Subtotal", children: _jsx(MoneyDisplay, { amount: detail.subtotal, size: "sm" }) }), detail.discount > 0 && (_jsx(TicketRow, { label: "Descuento", children: _jsx(MoneyDisplay, { amount: detail.discount, size: "sm" }) })), _jsx(TicketRow, { label: "TOTAL", strong: true, children: _jsx(MoneyDisplay, { amount: detail.total, size: "sm" }) }), detail.isCredit ? (_jsxs(_Fragment, { children: [_jsx(TicketRow, { label: "Pago", children: "FIADO" }), _jsxs("p", { className: "text-[11px] leading-snug", children: ["A: ", detail.creditTo || '—'] }), _jsx(TicketRow, { label: "Pag\u00F3", children: _jsx(MoneyDisplay, { amount: detail.paidTotal, size: "sm" }) }), _jsx(TicketRow, { label: "Saldo", strong: true, children: _jsx(MoneyDisplay, { amount: detail.remaining, size: "sm" }) })] })) : (_jsxs(_Fragment, { children: [_jsx(TicketRow, { label: "Pago", children: paymentMethodLabel(detail.paymentMethod) }), detail.paymentMethod === 'cash' && (_jsxs(_Fragment, { children: [_jsx(TicketRow, { label: "Pag\u00F3", children: _jsx(MoneyDisplay, { amount: detail.amountPaid, size: "sm" }) }), _jsx(TicketRow, { label: "Vuelto", children: _jsx(MoneyDisplay, { amount: detail.changeAmount, size: "sm" }) })] }))] })), _jsx("hr", { className: "my-2 border-neutral-400" }), _jsx("p", { className: "text-center", children: "\u00A1Gracias por su compra!" }), ticketSlogan.trim() ? (_jsx("p", { className: "mt-2 whitespace-pre-wrap text-center text-[10px] text-neutral-700", children: ticketSlogan.trim() })) : null] })) })] }) }));
}
