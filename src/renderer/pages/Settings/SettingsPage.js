import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { LABEL_PRESETS } from '@shared/lib/thermal-print';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { NumberInput } from '../../components/ui/NumberInput';
import { Select } from '../../components/ui/Select';
import { useLogoImage } from '../../hooks/useLogoImage';
import { playScanSound, playSuccessSound } from '../../lib/sounds';
import { useSettingsStore } from '../../stores/settings.store';
export function SettingsPage() {
    const store = useSettingsStore();
    const logoUrl = useLogoImage(store.companyLogoPath);
    const [theme, setTheme] = useState(store.theme);
    const [currencySymbol, setCurrencySymbol] = useState(store.currencySymbol);
    const [soundsEnabled, setSoundsEnabled] = useState(store.soundsEnabled);
    const [companyName, setCompanyName] = useState(store.companyName);
    const [companyAddress, setCompanyAddress] = useState(store.companyAddress);
    const [ticketSlogan, setTicketSlogan] = useState(store.ticketSlogan);
    const [printerTicket, setPrinterTicket] = useState(store.printerTicket);
    const [printerLabels, setPrinterLabels] = useState(store.printerLabels);
    const [printerPaperWidth, setPrinterPaperWidth] = useState(store.printerPaperWidth);
    const [ticketLogoWidthPercent, setTicketLogoWidthPercent] = useState(store.ticketLogoWidthPercent);
    const [labelPreset, setLabelPreset] = useState(store.labelPreset);
    const [labelWidthMm, setLabelWidthMm] = useState(store.labelWidthMm);
    const [labelHeightMm, setLabelHeightMm] = useState(store.labelHeightMm);
    const [labelDpi, setLabelDpi] = useState(store.labelDpi);
    const [printers, setPrinters] = useState([]);
    const [detecting, setDetecting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const syncForm = useCallback(() => {
        setTheme(store.theme);
        setCurrencySymbol(store.currencySymbol);
        setSoundsEnabled(store.soundsEnabled);
        setCompanyName(store.companyName);
        setCompanyAddress(store.companyAddress);
        setTicketSlogan(store.ticketSlogan);
        setPrinterTicket(store.printerTicket);
        setPrinterLabels(store.printerLabels);
        setPrinterPaperWidth(store.printerPaperWidth);
        setTicketLogoWidthPercent(store.ticketLogoWidthPercent);
        setLabelPreset(store.labelPreset);
        setLabelWidthMm(store.labelWidthMm);
        setLabelHeightMm(store.labelHeightMm);
        setLabelDpi(store.labelDpi);
    }, [store]);
    useEffect(() => {
        if (store.hydrated)
            syncForm();
    }, [store.hydrated, syncForm]);
    async function detectPrinters() {
        setDetecting(true);
        setError(null);
        const result = await window.api.settings.listPrinters();
        setDetecting(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setPrinters(result.data);
        setMessage(`${result.data.length} impresora(s) detectada(s)`);
    }
    useEffect(() => {
        void detectPrinters();
    }, []);
    const printerOptions = [
        { value: '', label: 'Predeterminada de Windows' },
        ...printers.map((p) => ({
            value: p.name,
            label: `${p.displayName}${p.isDefault ? ' (default)' : ''}`
        }))
    ];
    async function handlePickLogo() {
        setError(null);
        const result = await window.api.settings.pickLogo();
        if (!result.ok) {
            setError(result.error);
            return;
        }
        store.applyFromServer(result.data);
        syncForm();
        setMessage('Logo actualizado');
    }
    async function handleRemoveLogo() {
        const result = await window.api.settings.removeLogo();
        if (result.ok) {
            store.applyFromServer(result.data);
            syncForm();
            setMessage('Logo eliminado');
        }
    }
    async function handleTestLabelPrint() {
        setError(null);
        const saveFirst = await store.save({
            printerLabels,
            printerTicket,
            labelPreset,
            labelWidthMm,
            labelHeightMm,
            labelDpi,
            companyName
        });
        if (!saveFirst.ok) {
            setError(saveFirst.error);
            return;
        }
        const result = await window.api.settings.testLabelPrint();
        if (!result.ok)
            setError(result.error);
        else {
            const dims = labelPreset === 'custom'
                ? `${labelWidthMm}×${labelHeightMm}`
                : labelPreset.replace('x', '×');
            setMessage(`Etiqueta de prueba lista (${dims} mm)`);
        }
    }
    async function handleTestPrint() {
        setError(null);
        const saveFirst = await store.save({
            printerTicket,
            printerPaperWidth,
            ticketLogoWidthPercent,
            ticketSlogan,
            companyName,
            companyAddress,
            currencySymbol
        });
        if (!saveFirst.ok) {
            setError(saveFirst.error);
            return;
        }
        const result = await window.api.settings.testPrint();
        if (!result.ok)
            setError(result.error);
        else {
            const via = result.data?.method ? ` (${result.data.method})` : '';
            setMessage(`Ticket de prueba enviado${via}`);
        }
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const result = await store.save({
            theme,
            currencySymbol,
            soundsEnabled,
            companyName,
            companyAddress,
            ticketSlogan,
            printerTicket,
            printerLabels,
            printerPaperWidth,
            labelPreset,
            labelWidthMm,
            labelHeightMm,
            labelDpi,
            ticketLogoWidthPercent
        });
        setSaving(false);
        if (!result.ok) {
            setError(result.error ?? 'Error al guardar');
            return;
        }
        if (soundsEnabled)
            playSuccessSound();
        setMessage('Configuración guardada');
    }
    function handleTestSound() {
        if (soundsEnabled)
            playScanSound();
    }
    return (_jsxs("div", { className: "mx-auto max-w-3xl", children: [_jsxs("header", { className: "mb-6", children: [_jsx("h2", { className: "text-2xl font-semibold", children: "Configuraci\u00F3n" }), _jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Empresa, impresoras, sonidos y apariencia" })] }), message && (_jsx("p", { className: "mb-4 rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand", children: message })), error && (_jsx("p", { className: "mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600", children: error })), _jsxs("form", { onSubmit: (e) => void handleSubmit(e), className: "space-y-8", children: [_jsxs("section", { className: "rounded-xl border border-surface-border bg-surface-elevated p-5", children: [_jsx("h3", { className: "mb-4 font-medium", children: "Empresa" }), _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Nombre comercial", value: companyName, onChange: (e) => setCompanyName(e.target.value), required: true }), _jsx(Input, { label: "Direcci\u00F3n", value: companyAddress, onChange: (e) => setCompanyAddress(e.target.value), placeholder: "Opcional \u2014 aparece en el ticket" }), _jsxs("label", { className: "flex flex-col gap-1.5 text-sm", children: [_jsx("span", { className: "font-medium text-[rgb(var(--text))]", children: "Slogan del ticket" }), _jsx("textarea", { value: ticketSlogan, onChange: (e) => setTicketSlogan(e.target.value.slice(0, 280)), rows: 3, maxLength: 280, placeholder: "Ej. \u00ABEl Se\u00F1or es mi pastor; nada me faltar\u00E1.\u00BB \u2014 Salmo 23:1", className: "rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5 text-[rgb(var(--text))] placeholder:text-[rgb(var(--text-muted))] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" }), _jsxs("span", { className: "text-xs text-[rgb(var(--text-muted))]", children: ["Aparece al final, debajo de \u00AB\u00A1Gracias por su compra!\u00BB (", ticketSlogan.length, "/280)"] })] }), _jsxs("div", { children: [_jsx("p", { className: "mb-2 text-sm font-medium", children: "Logo (ticket)" }), _jsxs("p", { className: "mb-2 text-xs text-[rgb(var(--text-muted))]", children: ["Vista previa al ancho del rollo (", printerPaperWidth, "). Ajuste el tama\u00F1o si se corta al imprimir."] }), _jsx("div", { className: "mx-auto rounded-lg border border-dashed border-surface-border bg-white px-2 py-3 dark:bg-zinc-900", style: { width: printerPaperWidth === '80mm' ? 302 : 219, maxWidth: '100%' }, children: logoUrl ? (_jsx("img", { src: logoUrl, alt: "Logo en ticket", className: "mx-auto block h-auto object-contain", style: { width: `${ticketLogoWidthPercent}%` } })) : (_jsx("p", { className: "py-6 text-center text-xs text-[rgb(var(--text-muted))]", children: "Sin logo" })) }), _jsxs("label", { className: "mt-3 block text-sm font-medium", children: ["Tama\u00F1o del logo en ticket: ", ticketLogoWidthPercent, "%", _jsx("input", { type: "range", min: 40, max: 100, step: 5, value: ticketLogoWidthPercent, onChange: (e) => setTicketLogoWidthPercent(Number(e.target.value)), className: "mt-2 w-full accent-brand" })] }), _jsxs("div", { className: "mt-2 flex gap-2", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => void handlePickLogo(), children: "Elegir logo" }), store.companyLogoPath && (_jsx(Button, { type: "button", variant: "ghost", onClick: () => void handleRemoveLogo(), children: "Quitar" }))] })] })] })] }), _jsxs("section", { className: "rounded-xl border border-surface-border bg-surface-elevated p-5", children: [_jsxs("div", { className: "mb-4 flex flex-wrap items-center justify-between gap-2", children: [_jsx("h3", { className: "font-medium", children: "Impresoras" }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => void detectPrinters(), disabled: detecting, children: detecting ? 'Detectando...' : 'Detectar impresoras' })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Compatible con impresoras t\u00E9rmicas gen\u00E9ricas instaladas en Windows (cualquier marca). Conecte el USB, instale el driver del fabricante y pulse \u00ABDetectar impresoras\u00BB." }), _jsx(Select, { label: "Impresora de tickets (POS)", value: printerTicket, onChange: setPrinterTicket, options: printerOptions }), _jsx(Select, { label: "Ancho de rollo \u2014 tickets", value: printerPaperWidth, onChange: (v) => setPrinterPaperWidth(v === '80mm' ? '80mm' : '58mm'), options: [
                                            { value: '58mm', label: '58 mm (rollo pequeño)' },
                                            { value: '80mm', label: '80 mm (rollo ancho)' }
                                        ] }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => void handleTestPrint(), children: "Imprimir ticket de prueba" }), _jsx("hr", { className: "border-surface-border" }), _jsx(Select, { label: "Impresora de etiquetas", value: printerLabels, onChange: setPrinterLabels, options: printerOptions }), _jsx("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: "Si no elige impresora de etiquetas, se usar\u00E1 la de tickets o la predeterminada de Windows." }), _jsx(Select, { label: "Tama\u00F1o de etiqueta autoadhesiva", value: labelPreset, onChange: setLabelPreset, options: LABEL_PRESETS.map((p) => ({ value: p.id, label: p.label })) }), _jsx("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: "El PDF usar\u00E1 exactamente este tama\u00F1o. Con \u00ABMicrosoft Print to PDF\u00BB se abrir\u00E1 un di\u00E1logo para guardar el archivo." }), labelPreset === 'custom' && (_jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(NumberInput, { label: "Ancho (mm)", min: 15, max: 120, emptyValue: 50, value: labelWidthMm, onChange: setLabelWidthMm }), _jsx(NumberInput, { label: "Alto (mm)", min: 8, max: 80, emptyValue: 25, value: labelHeightMm, onChange: setLabelHeightMm })] })), _jsx(Select, { label: "Resoluci\u00F3n de etiquetas (DPI)", value: String(labelDpi), onChange: (v) => setLabelDpi(v === '300' ? 300 : 203), options: [
                                            { value: '203', label: '203 DPI (estándar térmica)' },
                                            { value: '300', label: '300 DPI (alta resolución)' }
                                        ] }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => void handleTestLabelPrint(), children: "Imprimir etiqueta de prueba" })] })] }), _jsxs("section", { className: "rounded-xl border border-surface-border bg-surface-elevated p-5", children: [_jsx("h3", { className: "mb-4 font-medium", children: "Sonidos" }), _jsxs("label", { className: "flex items-center gap-3 text-sm", children: [_jsx("input", { type: "checkbox", checked: soundsEnabled, onChange: (e) => setSoundsEnabled(e.target.checked), className: "rounded border-surface-border" }), "Sonidos al escanear y al cobrar"] }), _jsx(Button, { type: "button", variant: "ghost", className: "mt-2", onClick: handleTestSound, children: "Probar sonido" })] }), _jsxs("section", { className: "rounded-xl border border-surface-border bg-surface-elevated p-5", children: [_jsx("h3", { className: "mb-4 font-medium", children: "Apariencia y moneda" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("p", { className: "mb-2 text-sm font-medium", children: "Tema" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", variant: theme === 'light' ? 'primary' : 'secondary', onClick: () => setTheme('light'), children: "Claro" }), _jsx(Button, { type: "button", variant: theme === 'dark' ? 'primary' : 'secondary', onClick: () => setTheme('dark'), children: "Oscuro" })] })] }), _jsx(Input, { label: "S\u00EDmbolo de moneda", value: currencySymbol, onChange: (e) => setCurrencySymbol(e.target.value), placeholder: "S/", maxLength: 6 })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Button, { type: "submit", disabled: saving, children: saving ? 'Guardando...' : 'Guardar configuración' }), printers.length > 0 && (_jsxs(Badge, { variant: "muted", children: [printers.length, " impresoras"] }))] })] })] }));
}
