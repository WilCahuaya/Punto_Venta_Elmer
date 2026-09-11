import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { A4_LABEL_PRESETS, a4SheetsNeeded, a4SheetsNeededMixed, computeA4LabelGrid, resolveLabelDimensions } from '@shared/lib/thermal-print';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { NumberInput } from '../../components/ui/NumberInput';
import { Select } from '../../components/ui/Select';
import { barcodeToBase64, LABEL_BARCODE_OPTIONS } from '../../lib/barcode';
import { formatDateTime } from '../../lib/datetime';
import { useSettingsStore } from '../../stores/settings.store';
function resolveStoredSize(presetId, widthMm, heightMm, fallback) {
    const w = Math.round(widthMm ?? fallback.widthMm);
    const h = Math.round(heightMm ?? fallback.heightMm);
    const known = A4_LABEL_PRESETS.find((p) => p.id === presetId);
    if (known && known.id !== 'custom') {
        return { presetId: known.id, widthMm: known.widthMm, heightMm: known.heightMm };
    }
    const matched = A4_LABEL_PRESETS.find((p) => p.id !== 'custom' && p.widthMm === w && p.heightMm === h);
    if (matched) {
        return { presetId: matched.id, widthMm: matched.widthMm, heightMm: matched.heightMm };
    }
    if (presetId === 'custom' || widthMm != null || heightMm != null) {
        return { presetId: 'custom', widthMm: w, heightMm: h };
    }
    return fallback;
}
function sizeFromPreset(presetId, current) {
    const preset = A4_LABEL_PRESETS.find((p) => p.id === presetId);
    if (!preset)
        return current;
    if (preset.id === 'custom') {
        return { presetId: 'custom', widthMm: current.widthMm, heightMm: current.heightMm };
    }
    return { presetId: preset.id, widthMm: preset.widthMm, heightMm: preset.heightMm };
}
function resolvedDims(size, dpi) {
    return resolveLabelDimensions({
        presetId: size.presetId,
        widthMm: size.widthMm,
        heightMm: size.heightMm,
        dpi
    });
}
function formatSizeLabel(size) {
    const dims = resolvedDims(size, 300);
    return `${dims.widthMm} × ${dims.heightMm} mm`;
}
function sizeGroupKey(size, dpi) {
    const dims = resolvedDims(size, dpi);
    return `${size.presetId}:${dims.widthMm}x${dims.heightMm}`;
}
export function LabelHistoryPanel() {
    const printerLabels = useSettingsStore((s) => s.printerLabels);
    const labelPreset = useSettingsStore((s) => s.labelPreset);
    const labelWidthMm = useSettingsStore((s) => s.labelWidthMm);
    const labelHeightMm = useSettingsStore((s) => s.labelHeightMm);
    const labelDpi = useSettingsStore((s) => s.labelDpi);
    const settingsSize = {
        presetId: labelPreset,
        widthMm: labelWidthMm,
        heightMm: labelHeightMm
    };
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [job, setJob] = useState(null);
    const [editItems, setEditItems] = useState([]);
    const [printing, setPrinting] = useState(false);
    const [a4Printer, setA4Printer] = useState('');
    const [printers, setPrinters] = useState([]);
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const res = await window.api.labels.historyList();
        setLoading(false);
        if (res.ok)
            setJobs(res.data);
        else
            setError(res.error);
    }, []);
    useEffect(() => {
        void load();
    }, [load]);
    async function openJob(id) {
        setError(null);
        setMessage(null);
        const res = await window.api.labels.historyGet(id);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        const jobSize = resolveStoredSize(res.data.a4PresetId, res.data.a4WidthMm, res.data.a4HeightMm, settingsSize);
        setJob(res.data);
        setEditItems(res.data.items.map((item) => ({
            id: item.id,
            name: item.name,
            barcode: item.barcode,
            price: item.price,
            copies: item.copies,
            ...resolveStoredSize(item.presetId, item.widthMm, item.heightMm, jobSize)
        })));
        if (res.data.mode === 'a4') {
            const printersRes = await window.api.settings.listPrinters();
            if (printersRes.ok) {
                setPrinters(printersRes.data);
                const preferred = res.data.a4PrinterName ||
                    printersRes.data.find((p) => /pdf/i.test(p.name))?.name ||
                    printersRes.data.find((p) => p.name === printerLabels)?.name ||
                    printersRes.data.find((p) => p.isDefault)?.name ||
                    printersRes.data[0]?.name ||
                    '';
                setA4Printer(preferred);
            }
        }
    }
    function closeJob() {
        setJob(null);
        setEditItems([]);
    }
    function patchItem(id, patch) {
        setEditItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    }
    function setItemCopies(id, copies) {
        patchItem(id, { copies: Math.max(1, Math.min(500, copies)) });
    }
    function setItemPreset(id, presetId) {
        setEditItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...sizeFromPreset(presetId, item) } : item)));
    }
    function applySizeToAll(presetId) {
        setEditItems((prev) => prev.map((item) => ({ ...item, ...sizeFromPreset(presetId, item) })));
    }
    async function buildPayload(items, mode) {
        const uniqueCodes = [...new Set(items.map((i) => i.barcode))];
        const barcodeImages = {};
        for (const code of uniqueCodes) {
            barcodeImages[code] = await barcodeToBase64(code, LABEL_BARCODE_OPTIONS);
        }
        const dpi = mode === 'a4' ? 300 : labelDpi;
        const mapped = items.map((item) => {
            const dims = resolvedDims(item, dpi);
            return {
                name: item.name,
                barcode: item.barcode,
                price: item.price,
                copies: item.copies,
                presetId: item.presetId,
                widthMm: dims.widthMm,
                heightMm: dims.heightMm
            };
        });
        const first = mapped[0];
        if (mode === 'a4') {
            return {
                mode: 'a4',
                items: mapped,
                barcodeImages,
                a4: {
                    presetId: first?.presetId ?? 'custom',
                    widthMm: first?.widthMm,
                    heightMm: first?.heightMm,
                    printerName: a4Printer
                }
            };
        }
        return {
            mode: 'roll',
            items: mapped,
            barcodeImages,
            size: first
                ? { presetId: first.presetId, widthMm: first.widthMm, heightMm: first.heightMm }
                : undefined
        };
    }
    async function reprint(items) {
        if (!job || items.length === 0)
            return;
        if (job.mode === 'a4' && !a4Printer.trim()) {
            setError('Seleccione una impresora A4');
            return;
        }
        setPrinting(true);
        setError(null);
        setMessage(null);
        try {
            const payload = await buildPayload(items, job.mode);
            const result = await window.api.labels.print(payload);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            const sheetsTxt = result.data.sheets != null ? ` · ${result.data.sheets} hoja(s)` : '';
            setMessage(`${result.data.printed} etiqueta(s) reimpresas${sheetsTxt}`);
            closeJob();
            void load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Error al reimprimir');
        }
        finally {
            setPrinting(false);
        }
    }
    async function handleDelete(id) {
        if (!confirm('¿Eliminar este lote del historial?'))
            return;
        const res = await window.api.labels.historyDelete(id);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        setMessage('Lote eliminado del historial');
        if (job?.id === id)
            closeJob();
        void load();
    }
    async function handleClear() {
        if (!confirm('¿Vaciar todo el historial de etiquetas? Esta acción no se puede deshacer.')) {
            return;
        }
        const res = await window.api.labels.historyClear();
        if (!res.ok) {
            setError(res.error);
            return;
        }
        setMessage(`Historial vaciado (${res.data.deleted} lote(s))`);
        closeJob();
        void load();
    }
    const totalCopies = editItems.reduce((s, i) => s + i.copies, 0);
    const reprintDpi = job?.mode === 'a4' ? 300 : labelDpi;
    const sizeKeys = useMemo(() => new Set(editItems.map((item) => sizeGroupKey(item, reprintDpi))), [editItems, reprintDpi]);
    const mixedSizes = sizeKeys.size > 1;
    const firstDims = editItems[0] != null ? resolvedDims(editItems[0], reprintDpi) : null;
    const mixedSheetSizes = useMemo(() => editItems.flatMap((item) => {
        const dims = resolvedDims(item, reprintDpi);
        return Array.from({ length: item.copies }, () => ({
            widthMm: dims.widthMm,
            heightMm: dims.heightMm
        }));
    }), [editItems, reprintDpi]);
    const mixedA4Sheets = a4SheetsNeededMixed(mixedSheetSizes);
    const a4Grid = useMemo(() => firstDims
        ? computeA4LabelGrid(firstDims.widthMm, firstDims.heightMm)
        : { cols: 0, rows: 0, perSheet: 1, widthMm: 0, heightMm: 0 }, [firstDims?.heightMm, firstDims?.widthMm]);
    const a4SheetsPreview = mixedSizes
        ? mixedA4Sheets
        : a4SheetsNeeded(totalCopies, a4Grid.perSheet);
    const printerOptions = printers.map((p) => ({
        value: p.name,
        label: p.isDefault ? `${p.displayName} (predeterminada)` : p.displayName
    }));
    const allSamePreset = editItems.length > 0 && editItems.every((i) => i.presetId === editItems[0].presetId);
    const bulkPresetId = allSamePreset ? editItems[0].presetId : '';
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-medium", children: "Historial de impresi\u00F3n" }), _jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "El tama\u00F1o original se muestra en la tabla. Al reimprimir puede elegir el tama\u00F1o de cada producto; en A4 se colocan juntos en la misma hoja." })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { variant: "secondary", type: "button", onClick: () => void load(), disabled: loading, children: "Actualizar" }), _jsx(Button, { variant: "danger", type: "button", disabled: jobs.length === 0, onClick: () => void handleClear(), children: "Vaciar historial" })] })] }), message && (_jsx("p", { className: "rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand", children: message })), error && (_jsx("p", { className: "rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600", children: error })), _jsx("div", { className: "overflow-hidden rounded-xl border border-surface-border", children: _jsx("div", { className: "max-h-[560px] overflow-y-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "sticky top-0 z-10 bg-surface-elevated", children: _jsxs("tr", { className: "border-b border-surface-border text-left", children: [_jsx("th", { className: "px-4 py-2.5 font-medium", children: "Fecha" }), _jsx("th", { className: "px-4 py-2.5 font-medium", children: "Modo" }), _jsx("th", { className: "px-4 py-2.5 font-medium", children: "Tama\u00F1o" }), _jsx("th", { className: "px-4 py-2.5 font-medium", children: "Resumen" }), _jsx("th", { className: "px-4 py-2.5 text-right font-medium", children: "Etiquetas" }), _jsx("th", { className: "px-4 py-2.5 text-right font-medium", children: "Acciones" })] }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-4 py-10 text-center text-[rgb(var(--text-muted))]", children: "Cargando historial..." }) })) : jobs.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-4 py-10 text-center text-[rgb(var(--text-muted))]", children: "A\u00FAn no hay impresiones guardadas. Al imprimir etiquetas quedar\u00E1n aqu\u00ED." }) })) : (jobs.map((j) => {
                                    const size = resolveStoredSize(j.presetId, j.widthMm, j.heightMm, settingsSize);
                                    const sizeLabel = j.mixedSizes ? 'Varios' : formatSizeLabel(size);
                                    return (_jsxs("tr", { className: "border-b border-surface-border/50 hover:bg-surface-elevated/40", children: [_jsx("td", { className: "px-4 py-3", children: formatDateTime(j.printedAt) }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: j.mode === 'a4' ? 'warning' : 'success', children: j.mode === 'a4' ? 'A4' : 'Rollo' }) }), _jsx("td", { className: "px-4 py-3 font-medium tabular-nums", children: sizeLabel }), _jsxs("td", { className: "px-4 py-3", children: [_jsxs("p", { className: "font-medium", children: [j.itemCount, " producto", j.itemCount === 1 ? '' : 's'] }), _jsxs("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: [j.previewNames || '—', j.sheets != null ? ` · ${j.sheets} hoja(s)` : ''] })] }), _jsx("td", { className: "px-4 py-3 text-right tabular-nums", children: j.labelCount }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsxs("div", { className: "flex flex-wrap justify-end gap-1", children: [_jsx(Button, { type: "button", onClick: () => void openJob(j.id), children: "Reimprimir" }), _jsx(Button, { variant: "ghost", type: "button", onClick: () => void handleDelete(j.id), children: "Borrar" })] }) })] }, j.id));
                                })) })] }) }) }), _jsx(Modal, { open: !!job, title: job ? `Reimprimir · ${formatDateTime(job.printedAt)}` : 'Reimprimir', onClose: closeJob, size: "xl", footer: job && (_jsxs("div", { className: "flex w-full flex-wrap items-center justify-between gap-2", children: [_jsxs("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: ["Total: ", _jsx("strong", { className: "text-[rgb(var(--text))]", children: totalCopies }), ' ', "etiqueta(s) \u00B7 ", job.mode === 'a4' ? 'Hoja A4' : 'Rollo térmico', mixedSizes
                                    ? job.mode === 'a4'
                                        ? ` · tamaños mixtos · ~${mixedA4Sheets} hoja(s)`
                                        : ' · tamaños distintos (rollo: un trabajo por tamaño)'
                                    : firstDims
                                        ? ` · ${firstDims.widthMm}×${firstDims.heightMm} mm`
                                        : ''] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { variant: "secondary", type: "button", onClick: closeJob, disabled: printing, children: "Cancelar" }), _jsx(Button, { type: "button", disabled: printing || totalCopies < 1, onClick: () => void reprint(editItems), children: printing ? 'Imprimiendo...' : `Reimprimir lote (${totalCopies})` })] })] })), children: job && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(Select, { label: "Tama\u00F1o para todos", value: bulkPresetId, onChange: applySizeToAll, placeholder: mixedSizes ? 'Varios tamaños' : undefined, options: A4_LABEL_PRESETS.map((p) => ({ value: p.id, label: p.label })) }), job.mode === 'a4' && (_jsx(Select, { label: "Impresora A4", value: a4Printer, onChange: setA4Printer, options: printerOptions.length
                                        ? printerOptions
                                        : [{ value: '', label: 'Sin impresoras detectadas' }] }))] }), job.mode === 'a4' && !mixedSizes && firstDims && (_jsxs("div", { className: "rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand", children: ["En cada hoja A4 caben ", a4Grid.cols, " \u00D7 ", a4Grid.rows, " = ", a4Grid.perSheet, " etiquetas de", ' ', firstDims.widthMm, " \u00D7 ", firstDims.heightMm, " mm. Se imprimir\u00E1n unas ", a4SheetsPreview, ' ', "hoja(s)."] })), job.mode === 'a4' && mixedSizes && (_jsxs("div", { className: "rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand", children: ["Las etiquetas de distinto tama\u00F1o se colocan en la misma hoja A4 (~", mixedA4Sheets, ' ', "hoja(s)). Use papel en blanco o para cortar; no planchas precortadas de un solo formato."] })), job.mode === 'roll' && mixedSizes && (_jsx("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: "En rollo cada tama\u00F1o se imprime por separado." })), _jsx("ul", { className: "divide-y divide-surface-border rounded-xl border border-surface-border", children: editItems.map((item) => (_jsxs("li", { className: "space-y-3 px-4 py-3", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { className: "min-w-[180px] flex-1", children: [_jsx("p", { className: "font-medium", children: item.name }), _jsx("p", { className: "font-mono text-xs text-[rgb(var(--text-muted))]", children: item.barcode }), item.price != null && item.price > 0 && (_jsx(MoneyDisplay, { amount: item.price, size: "sm" }))] }), _jsx(Button, { variant: "secondary", type: "button", disabled: printing, onClick: () => void reprint([item]), children: "Solo este" })] }), _jsxs("div", { className: "grid gap-3 sm:grid-cols-[1fr_7rem]", children: [_jsx(Select, { label: "Tama\u00F1o de etiqueta", value: item.presetId, onChange: (presetId) => setItemPreset(item.id, presetId), options: A4_LABEL_PRESETS.map((p) => ({ value: p.id, label: p.label })) }), _jsx(NumberInput, { label: "Copias", min: 1, max: 500, value: item.copies, onChange: (n) => setItemCopies(item.id, n) })] }), item.presetId === 'custom' && (_jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(NumberInput, { label: "Ancho (mm)", min: 15, max: 120, emptyValue: 50, value: item.widthMm, onChange: (n) => patchItem(item.id, { widthMm: n }) }), _jsx(NumberInput, { label: "Alto (mm)", min: 8, max: 80, emptyValue: 25, value: item.heightMm, onChange: (n) => patchItem(item.id, { heightMm: n }) })] }))] }, item.id))) })] })) })] }));
}
