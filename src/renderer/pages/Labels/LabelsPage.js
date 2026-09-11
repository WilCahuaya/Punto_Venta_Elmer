import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { NumberInput } from '../../components/ui/NumberInput';
import { Select } from '../../components/ui/Select';
import { barcodeToBase64, LABEL_BARCODE_OPTIONS } from '../../lib/barcode';
import { formatMoney } from '@shared/lib/currency';
import { buildSingleLabelDocumentHtml } from '@shared/lib/label-html';
import { A4_LABEL_PRESETS, a4SheetsNeeded, a4SheetsNeededMixed, computeA4LabelGrid, isCompactLabel, resolveLabelDimensions } from '@shared/lib/thermal-print';
import { LabelHistoryPanel } from '../../features/labels/LabelHistoryPanel';
import { useLabelQueueStore } from '../../stores/label-queue.store';
import { useSettingsStore } from '../../stores/settings.store';
function EyeIcon() {
    return (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, children: [_jsx("path", { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }));
}
/** Nombre + marca + talla + color (si existen). */
function formatProductLabelSummary(p) {
    const parts = [p.name, p.brand, p.size, p.color]
        .map((v) => v?.trim())
        .filter((v) => Boolean(v));
    return parts.join(' · ');
}
function resolvePrintProductName(p, consolidated) {
    return consolidated ? formatProductLabelSummary(p) : p.name;
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
export function LabelsPage() {
    const currencySymbol = useSettingsStore((s) => s.currencySymbol);
    const labelPreset = useSettingsStore((s) => s.labelPreset);
    const labelWidthMm = useSettingsStore((s) => s.labelWidthMm);
    const labelHeightMm = useSettingsStore((s) => s.labelHeightMm);
    const labelDpi = useSettingsStore((s) => s.labelDpi);
    const printerLabels = useSettingsStore((s) => s.printerLabels);
    const queue = useLabelQueueStore((s) => s.queue);
    const addQueueItem = useLabelQueueStore((s) => s.addItem);
    const updateQueueItem = useLabelQueueStore((s) => s.updateItem);
    const applySizeToAllQueue = useLabelQueueStore((s) => s.applySizeToAll);
    const removeQueueItem = useLabelQueueStore((s) => s.removeItem);
    const clearQueue = useLabelQueueStore((s) => s.clear);
    const [pageTab, setPageTab] = useState('print');
    const [printMode, setPrintMode] = useState('roll');
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [customName, setCustomName] = useState('');
    const [customBarcode, setCustomBarcode] = useState('');
    const [customPrice, setCustomPrice] = useState(0);
    const [copies, setCopies] = useState(1);
    const [formPresetId, setFormPresetId] = useState(labelPreset);
    const [formWidthMm, setFormWidthMm] = useState(labelWidthMm);
    const [formHeightMm, setFormHeightMm] = useState(labelHeightMm);
    const [useConsolidatedName, setUseConsolidatedName] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [a4ModalOpen, setA4ModalOpen] = useState(false);
    const [a4PresetId, setA4PresetId] = useState(A4_LABEL_PRESETS[0]?.id ?? '50x25');
    const [a4WidthMm, setA4WidthMm] = useState(50);
    const [a4HeightMm, setA4HeightMm] = useState(25);
    const [a4Printer, setA4Printer] = useState('');
    const [printers, setPrinters] = useState([]);
    const [loadingPrinters, setLoadingPrinters] = useState(false);
    const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    const [pdfPreviewMeta, setPdfPreviewMeta] = useState('');
    const [previewing, setPreviewing] = useState(false);
    const [livePreviewHtml, setLivePreviewHtml] = useState('');
    const previewCode = customBarcode.trim() || selectedProduct?.barcode || '';
    const formDims = useMemo(() => resolveLabelDimensions({
        presetId: formPresetId,
        widthMm: formWidthMm,
        heightMm: formHeightMm,
        dpi: printMode === 'a4' ? 300 : labelDpi
    }), [formHeightMm, formPresetId, formWidthMm, labelDpi, printMode]);
    const a4Dims = useMemo(() => resolveLabelDimensions({
        presetId: a4PresetId,
        widthMm: a4WidthMm,
        heightMm: a4HeightMm,
        dpi: 300
    }), [a4PresetId, a4HeightMm, a4WidthMm]);
    const activeDims = formDims;
    const compactPreview = isCompactLabel(activeDims.widthMm, activeDims.heightMm);
    const previewMaxWidthPx = compactPreview ? 220 : 280;
    const previewWidthPx = previewMaxWidthPx;
    const previewHeightPx = Math.max(compactPreview ? 36 : 48, Math.round((previewMaxWidthPx * activeDims.heightMm) / activeDims.widthMm));
    /** Tamaño CSS en px del HTML de etiqueta (96 dpi ≈ impresión Chromium). */
    const labelNaturalPx = useMemo(() => {
        const mmToPx = (mm) => (mm * 96) / 25.4;
        return {
            w: mmToPx(activeDims.widthMm),
            h: mmToPx(activeDims.heightMm)
        };
    }, [activeDims.heightMm, activeDims.widthMm]);
    const previewScale = Math.min(previewWidthPx / labelNaturalPx.w, previewHeightPx / labelNaturalPx.h);
    useEffect(() => {
        if (!search.trim()) {
            setProducts([]);
            return;
        }
        const t = setTimeout(async () => {
            const res = await window.api.products.list({ search, includeInactive: false });
            if (res.ok)
                setProducts(res.data.filter((p) => p.barcode));
        }, 150);
        return () => clearTimeout(t);
    }, [search]);
    const previewName = customName.trim() || selectedProduct?.name || 'Producto';
    const previewPrice = customPrice > 0
        ? customPrice
        : selectedProduct?.priceRetail && selectedProduct.priceRetail > 0
            ? selectedProduct.priceRetail
            : null;
    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(() => {
            void (async () => {
                if (!previewCode) {
                    if (!cancelled) {
                        setLivePreviewHtml(buildSingleLabelDocumentHtml({
                            productName: previewName,
                            priceText: previewPrice != null && previewPrice > 0
                                ? formatMoney(previewPrice, currencySymbol)
                                : null,
                            barcodeCode: '',
                            barcodeSrc: ''
                        }, activeDims));
                    }
                    return;
                }
                try {
                    const b64 = await barcodeToBase64(previewCode, LABEL_BARCODE_OPTIONS);
                    if (cancelled)
                        return;
                    setLivePreviewHtml(buildSingleLabelDocumentHtml({
                        productName: previewName,
                        priceText: previewPrice != null && previewPrice > 0
                            ? formatMoney(previewPrice, currencySymbol)
                            : null,
                        barcodeCode: previewCode,
                        barcodeSrc: `data:image/png;base64,${b64}`
                    }, activeDims));
                }
                catch {
                    if (!cancelled)
                        setLivePreviewHtml('');
                }
            })();
        }, 120);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        previewCode,
        previewName,
        previewPrice,
        activeDims.widthMm,
        activeDims.heightMm,
        activeDims.dpi,
        currencySymbol
    ]);
    function addToQueue(item) {
        if (!item.barcode.trim()) {
            setError('El código de barras es obligatorio');
            return;
        }
        addQueueItem(item);
        setMessage(`Agregado: ${item.name}`);
        setError(null);
    }
    function handleAddToQueue() {
        const barcode = customBarcode.trim();
        if (!barcode) {
            setError('El código de barras es obligatorio');
            return;
        }
        addToQueue({
            name: customName.trim() || selectedProduct?.name || barcode,
            barcode,
            price: customPrice > 0 ? customPrice : null,
            copies,
            presetId: formPresetId,
            widthMm: formDims.widthMm,
            heightMm: formDims.heightMm
        });
    }
    function handleFormPresetChange(presetId) {
        const next = sizeFromPreset(presetId, {
            presetId: formPresetId,
            widthMm: formWidthMm,
            heightMm: formHeightMm
        });
        setFormPresetId(next.presetId);
        setFormWidthMm(next.widthMm);
        setFormHeightMm(next.heightMm);
    }
    function handleQueuePresetChange(id, presetId, item) {
        const next = sizeFromPreset(presetId, {
            presetId: item.presetId ?? formPresetId,
            widthMm: item.widthMm ?? formWidthMm,
            heightMm: item.heightMm ?? formHeightMm
        });
        updateQueueItem(id, next);
    }
    function handleApplySizeToAll(presetId) {
        const next = sizeFromPreset(presetId, {
            presetId: formPresetId,
            widthMm: formWidthMm,
            heightMm: formHeightMm
        });
        setFormPresetId(next.presetId);
        setFormWidthMm(next.widthMm);
        setFormHeightMm(next.heightMm);
        setA4PresetId(next.presetId);
        setA4WidthMm(next.widthMm);
        setA4HeightMm(next.heightMm);
        applySizeToAllQueue(next);
    }
    async function loadPrintersForA4() {
        setLoadingPrinters(true);
        const result = await window.api.settings.listPrinters();
        setLoadingPrinters(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setPrinters(result.data);
        const preferred = result.data.find((p) => /pdf/i.test(p.name) || /pdf/i.test(p.displayName))?.name ??
            result.data.find((p) => p.name === printerLabels)?.name ??
            result.data.find((p) => p.isDefault)?.name ??
            result.data[0]?.name ??
            '';
        setA4Printer((prev) => prev || preferred);
    }
    async function openA4Modal() {
        if (queue.length === 0) {
            setError('La cola de impresión está vacía');
            return;
        }
        setError(null);
        setA4ModalOpen(true);
        await loadPrintersForA4();
    }
    async function buildBarcodeImages() {
        const uniqueCodes = [...new Set(queue.map((i) => i.barcode))];
        const barcodeImages = {};
        for (const code of uniqueCodes) {
            barcodeImages[code] = await barcodeToBase64(code, LABEL_BARCODE_OPTIONS);
        }
        return barcodeImages;
    }
    function buildPrintPayload(barcodeImages) {
        const dpi = printMode === 'a4' ? 300 : labelDpi;
        const items = queue.map(({ name, barcode, price, copies: c, presetId, widthMm, heightMm }) => {
            const dims = resolveLabelDimensions({
                presetId: presetId ?? formPresetId,
                widthMm: widthMm ?? formWidthMm,
                heightMm: heightMm ?? formHeightMm,
                dpi
            });
            return {
                name,
                barcode,
                price,
                copies: c,
                presetId: presetId ?? formPresetId,
                widthMm: dims.widthMm,
                heightMm: dims.heightMm
            };
        });
        const first = items[0];
        if (printMode === 'a4') {
            return {
                mode: 'a4',
                items,
                barcodeImages,
                a4: {
                    presetId: first?.presetId ?? a4PresetId,
                    widthMm: first?.widthMm ?? a4Dims.widthMm,
                    heightMm: first?.heightMm ?? a4Dims.heightMm,
                    printerName: a4Printer
                }
            };
        }
        return {
            mode: 'roll',
            items,
            barcodeImages,
            size: first
                ? { presetId: first.presetId ?? formPresetId, widthMm: first.widthMm, heightMm: first.heightMm }
                : { presetId: formPresetId, widthMm: formDims.widthMm, heightMm: formDims.heightMm }
        };
    }
    function closePdfPreview() {
        setPdfPreviewOpen(false);
        if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
        }
        setPdfPreviewMeta('');
    }
    async function handlePreviewPdf() {
        if (queue.length === 0) {
            setError('La cola de impresión está vacía');
            return;
        }
        setPreviewing(true);
        setError(null);
        try {
            const barcodeImages = await buildBarcodeImages();
            const result = await window.api.labels.previewPdf(buildPrintPayload(barcodeImages));
            if (!result.ok) {
                setError(result.error);
                return;
            }
            const binary = atob(result.data.pdfBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++)
                bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: 'application/pdf' });
            if (pdfPreviewUrl)
                URL.revokeObjectURL(pdfPreviewUrl);
            const url = URL.createObjectURL(blob);
            setPdfPreviewUrl(url);
            const sheetsTxt = result.data.mode === 'a4' && result.data.sheets
                ? ` · ${result.data.sheets} hoja(s) A4`
                : '';
            setPdfPreviewMeta(`${result.data.labelCount} etiqueta(s) · ${result.data.widthMm}×${result.data.heightMm} mm${sheetsTxt}`);
            setPdfPreviewOpen(true);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Error al generar vista previa');
        }
        finally {
            setPreviewing(false);
        }
    }
    async function handlePrintRoll() {
        if (queue.length === 0) {
            setError('La cola de impresión está vacía');
            return;
        }
        setPrinting(true);
        setError(null);
        try {
            const barcodeImages = await buildBarcodeImages();
            const result = await window.api.labels.print(buildPrintPayload(barcodeImages));
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setMessage(mixedSizes
                ? `${result.data.printed} etiqueta(s) en rollo (tamaños mixtos)`
                : `${result.data.printed} etiqueta(s) en rollo (${queueA4Dims.widthMm}×${queueA4Dims.heightMm} mm)`);
            clearQueue();
            closePdfPreview();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Error al generar códigos');
        }
        finally {
            setPrinting(false);
        }
    }
    async function handlePrintA4() {
        if (!a4Printer.trim()) {
            setError('Seleccione una impresora');
            return;
        }
        setPrinting(true);
        setError(null);
        try {
            const barcodeImages = await buildBarcodeImages();
            const result = await window.api.labels.print(buildPrintPayload(barcodeImages));
            if (!result.ok) {
                setError(result.error);
                return;
            }
            const sheets = result.data.sheets ?? a4SheetsNeeded(result.data.printed, queueA4Grid.perSheet);
            setMessage(mixedSizes
                ? `${result.data.printed} etiqueta(s) en ${sheets} hoja(s) A4 (tamaños mixtos)`
                : `${result.data.printed} etiqueta(s) en ${sheets} hoja(s) A4 (${queueA4Dims.widthMm}×${queueA4Dims.heightMm} mm)`);
            clearQueue();
            setA4ModalOpen(false);
            closePdfPreview();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Error al generar códigos');
        }
        finally {
            setPrinting(false);
        }
    }
    function handlePrintClick() {
        if (printMode === 'a4')
            void openA4Modal();
        else
            void handlePrintRoll();
    }
    function handlePrintFromPreview() {
        if (printMode === 'a4') {
            closePdfPreview();
            void openA4Modal();
            return;
        }
        void handlePrintRoll();
    }
    const totalLabels = queue.reduce((s, i) => s + i.copies, 0);
    const printDpi = printMode === 'a4' ? 300 : labelDpi;
    const queueSizeKeys = useMemo(() => {
        return new Set(queue.map((item) => {
            const dims = resolveLabelDimensions({
                presetId: item.presetId ?? formPresetId,
                widthMm: item.widthMm ?? formWidthMm,
                heightMm: item.heightMm ?? formHeightMm,
                dpi: printDpi
            });
            return `${dims.widthMm}x${dims.heightMm}`;
        }));
    }, [formHeightMm, formPresetId, formWidthMm, printDpi, queue]);
    const mixedSizes = queueSizeKeys.size > 1;
    const mixedSheetSizes = useMemo(() => queue.flatMap((item) => {
        const dims = resolveLabelDimensions({
            presetId: item.presetId ?? formPresetId,
            widthMm: item.widthMm ?? formWidthMm,
            heightMm: item.heightMm ?? formHeightMm,
            dpi: printDpi
        });
        return Array.from({ length: item.copies }, () => ({
            widthMm: dims.widthMm,
            heightMm: dims.heightMm
        }));
    }), [formHeightMm, formPresetId, formWidthMm, printDpi, queue]);
    const mixedA4Sheets = a4SheetsNeededMixed(mixedSheetSizes);
    const queueA4Dims = useMemo(() => {
        const item = queue[0];
        if (!item)
            return a4Dims;
        return resolveLabelDimensions({
            presetId: item.presetId ?? formPresetId,
            widthMm: item.widthMm ?? formWidthMm,
            heightMm: item.heightMm ?? formHeightMm,
            dpi: 300
        });
    }, [a4Dims, formHeightMm, formPresetId, formWidthMm, queue]);
    const queueA4Grid = useMemo(() => computeA4LabelGrid(queueA4Dims.widthMm, queueA4Dims.heightMm), [queueA4Dims.heightMm, queueA4Dims.widthMm]);
    const a4SheetsPreview = mixedSizes
        ? mixedA4Sheets
        : a4SheetsNeeded(totalLabels, queueA4Grid.perSheet);
    const allQueueSamePreset = queue.length > 0 &&
        queue.every((i) => (i.presetId ?? formPresetId) === (queue[0].presetId ?? formPresetId));
    const bulkQueuePresetId = allQueueSamePreset ? (queue[0]?.presetId ?? formPresetId) : '';
    const printerOptions = [
        ...printers.map((p) => ({
            value: p.name,
            label: p.isDefault ? `${p.displayName} (predeterminada)` : p.displayName
        }))
    ];
    return (_jsxs("div", { children: [_jsxs("header", { className: "mb-4 flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold", children: "Etiquetas" }), _jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: pageTab === 'history'
                                    ? 'Historial de impresiones para reimprimir'
                                    : printMode === 'a4'
                                        ? mixedSizes
                                            ? `Hoja A4 · tamaños mixtos · ~${mixedA4Sheets} hoja(s)`
                                            : `Hoja A4 · etiquetas ${formDims.widthMm} × ${formDims.heightMm} mm`
                                        : mixedSizes
                                            ? 'Rollo térmico · tamaños mixtos · CODE128'
                                            : `Rollo térmico · ${formDims.widthMm} × ${formDims.heightMm} mm · CODE128` })] }), pageTab === 'print' && (_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("div", { className: "flex rounded-lg border border-surface-border p-0.5", children: [_jsx("button", { type: "button", className: [
                                            'rounded-md px-3 py-1.5 text-sm transition-colors',
                                            printMode === 'roll'
                                                ? 'bg-brand/15 font-medium text-brand ring-1 ring-brand/40'
                                                : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]'
                                        ].join(' '), onClick: () => setPrintMode('roll'), children: "Rollo t\u00E9rmico" }), _jsx("button", { type: "button", className: [
                                            'rounded-md px-3 py-1.5 text-sm transition-colors',
                                            printMode === 'a4'
                                                ? 'bg-brand/15 font-medium text-brand ring-1 ring-brand/40'
                                                : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]'
                                        ].join(' '), onClick: () => setPrintMode('a4'), children: "Hoja A4" })] }), _jsx(Button, { variant: "secondary", disabled: queue.length === 0 || printing, onClick: () => clearQueue(), children: "Vaciar cola" }), _jsxs(Button, { variant: "secondary", disabled: queue.length === 0 || printing || previewing, onClick: () => void handlePreviewPdf(), title: "Previsualizar PDF", "aria-label": "Previsualizar PDF", children: [_jsx(EyeIcon, {}), previewing ? 'Generando...' : 'Vista previa'] }), _jsx(Button, { disabled: queue.length === 0 || printing, onClick: handlePrintClick, children: printing
                                    ? 'Imprimiendo...'
                                    : printMode === 'a4'
                                        ? `Imprimir A4 (${totalLabels})`
                                        : `Imprimir (${totalLabels})` })] }))] }), _jsxs("div", { className: "mb-5 flex rounded-lg border border-surface-border p-0.5 w-fit", children: [_jsx("button", { type: "button", className: [
                            'rounded-md px-4 py-1.5 text-sm transition-colors',
                            pageTab === 'print'
                                ? 'bg-brand/15 font-medium text-brand ring-1 ring-brand/40'
                                : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]'
                        ].join(' '), onClick: () => setPageTab('print'), children: "Imprimir" }), _jsx("button", { type: "button", className: [
                            'rounded-md px-4 py-1.5 text-sm transition-colors',
                            pageTab === 'history'
                                ? 'bg-brand/15 font-medium text-brand ring-1 ring-brand/40'
                                : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]'
                        ].join(' '), onClick: () => setPageTab('history'), children: "Historial" })] }), pageTab === 'history' ? (_jsx(LabelHistoryPanel, {})) : (_jsxs(_Fragment, { children: [_jsx("p", { className: "mb-4 text-xs text-[rgb(var(--text-muted))]", children: printMode === 'a4'
                            ? 'Elija el tamaño de cada producto en la cola. En A4 los distintos tamaños se colocan en la misma hoja (papel en blanco). Use Vista previa para revisar el PDF.'
                            : 'Elija el tamaño de cada producto en la cola. En rollo cada tamaño se imprime por separado. Use Vista previa para revisar el PDF.' }), message && (_jsx("p", { className: "mb-4 rounded-lg bg-brand/10 px-4 py-2 text-sm text-brand", children: message })), error && (_jsx("p", { className: "mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600", children: error })), _jsxs("div", { className: "grid gap-6 lg:grid-cols-3", children: [_jsxs("section", { className: "rounded-xl border border-surface-border bg-surface-elevated p-4 lg:col-span-1", children: [_jsxs("h3", { className: "mb-3 font-medium", children: ["Cola de impresi\u00F3n (", totalLabels, ")"] }), queue.length === 0 ? (_jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Sin etiquetas en cola" })) : (_jsx("ul", { className: "max-h-[28rem] space-y-2 overflow-y-auto", children: queue.map((item) => {
                                            const presetId = item.presetId ?? formPresetId;
                                            const widthMm = item.widthMm ?? formWidthMm;
                                            const heightMm = item.heightMm ?? formHeightMm;
                                            const dims = resolveLabelDimensions({
                                                presetId,
                                                widthMm,
                                                heightMm,
                                                dpi: printDpi
                                            });
                                            return (_jsxs("li", { className: "space-y-2 rounded-lg border border-surface-border/60 px-3 py-2 text-sm", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "font-medium leading-snug", children: item.name }), _jsx("p", { className: "font-mono text-xs text-[rgb(var(--text-muted))]", children: item.barcode }), item.price != null && item.price > 0 && (_jsx(MoneyDisplay, { amount: item.price, size: "sm" })), _jsxs("p", { className: "mt-0.5 text-xs tabular-nums text-[rgb(var(--text-muted))]", children: [dims.widthMm, " \u00D7 ", dims.heightMm, " mm"] })] }), _jsx("button", { type: "button", className: "text-xs text-red-500", onClick: () => removeQueueItem(item.id), children: "Quitar" })] }), _jsx(Select, { label: "Tama\u00F1o", value: presetId, onChange: (id) => handleQueuePresetChange(item.id, id, item), options: A4_LABEL_PRESETS.map((p) => ({ value: p.id, label: p.label })) }), presetId === 'custom' && (_jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(NumberInput, { label: "Ancho", min: 15, max: 120, emptyValue: 50, value: widthMm, onChange: (n) => updateQueueItem(item.id, { presetId: 'custom', widthMm: n }) }), _jsx(NumberInput, { label: "Alto", min: 8, max: 80, emptyValue: 25, value: heightMm, onChange: (n) => updateQueueItem(item.id, { presetId: 'custom', heightMm: n }) })] })), _jsx(NumberInput, { label: "Copias", min: 1, max: 500, value: item.copies, onChange: (n) => updateQueueItem(item.id, { copies: Math.max(1, Math.min(500, n)) }) })] }, item.id));
                                        }) }))] }), _jsxs("section", { className: "rounded-xl border border-surface-border bg-surface-elevated p-4 lg:col-span-1", children: [_jsx("h3", { className: "mb-1 font-medium", children: "1. Elegir producto" }), _jsx("p", { className: "mb-3 text-xs text-[rgb(var(--text-muted))]", children: "Busque y seleccione; los datos pasan a la derecha." }), _jsx(Input, { label: "Buscar producto", placeholder: "Nombre o c\u00F3digo...", value: search, onChange: (e) => setSearch(e.target.value) }), _jsx("div", { className: "mt-2 max-h-40 overflow-y-auto rounded-lg border border-surface-border", children: products.length === 0 ? (_jsx("p", { className: "p-3 text-xs text-[rgb(var(--text-muted))]", children: search ? 'Sin resultados con código' : 'Busque un producto' })) : (products.slice(0, 8).map((p) => (_jsxs("button", { type: "button", className: [
                                                'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface',
                                                selectedProduct?.id === p.id ? 'bg-brand/10' : ''
                                            ].join(' '), onClick: () => {
                                                setSelectedProduct(p);
                                                setCustomBarcode(p.barcode ?? '');
                                                setCustomName(resolvePrintProductName(p, useConsolidatedName));
                                                setCustomPrice(p.priceRetail);
                                            }, children: [_jsxs("span", { className: "min-w-0", children: [_jsx("span", { className: "block truncate font-medium", children: formatProductLabelSummary(p) }), p.categoryName ? (_jsx("span", { className: "block truncate text-xs text-[rgb(var(--text-muted))]", children: p.categoryName })) : null] }), _jsx("span", { className: "shrink-0 font-mono text-xs", children: p.barcode })] }, p.id)))) }), selectedProduct && (_jsxs("div", { className: "mt-3 rounded-lg border border-surface-border/60 bg-surface px-3 py-2 text-sm", children: [_jsx("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: "Producto seleccionado" }), _jsx("p", { className: "font-medium leading-snug", children: formatProductLabelSummary(selectedProduct) }), _jsxs("p", { className: "mt-0.5 font-mono text-xs text-[rgb(var(--text-muted))]", children: [selectedProduct.barcode, selectedProduct.categoryName ? ` · ${selectedProduct.categoryName}` : ''] })] }))] }), _jsxs("section", { className: "rounded-xl border border-surface-border bg-surface-elevated p-4 lg:col-span-1", children: [_jsx("h3", { className: "mb-1 font-medium", children: "2. Datos de la etiqueta" }), _jsx("p", { className: "mb-3 text-xs text-[rgb(var(--text-muted))]", children: "Revise o edite y agregue a la cola." }), _jsxs("div", { className: "space-y-3", children: [_jsx(Input, { label: "Nombre en etiqueta", value: customName, onChange: (e) => setCustomName(e.target.value), placeholder: "Nombre a imprimir" }), _jsxs("label", { className: "flex items-start gap-2 text-sm", children: [_jsx("input", { type: "checkbox", className: "mt-0.5", checked: useConsolidatedName, disabled: !selectedProduct, onChange: (e) => {
                                                            const next = e.target.checked;
                                                            setUseConsolidatedName(next);
                                                            if (selectedProduct) {
                                                                setCustomName(resolvePrintProductName(selectedProduct, next));
                                                            }
                                                        } }), _jsxs("span", { children: [_jsx("span", { className: "font-medium", children: "Nombre consolidado en impresi\u00F3n" }), _jsx("span", { className: "mt-0.5 block text-xs text-[rgb(var(--text-muted))]", children: "Incluye marca, talla y color (si existen) en el texto de la etiqueta." })] })] }), _jsxs("div", { children: [_jsx(Input, { label: "C\u00F3digo de barras", value: customBarcode, readOnly: true, className: "cursor-not-allowed font-mono opacity-80", placeholder: "Seleccione un producto" }), _jsx("p", { className: "mt-1 text-xs text-[rgb(var(--text-muted))]", children: "Solo se muestra para imprimir. No se puede cambiar aqu\u00ED." })] }), _jsx(MoneyInput, { label: "Precio (opcional)", value: customPrice, onChange: setCustomPrice }), _jsx(Select, { label: "Tama\u00F1o de etiqueta", value: formPresetId, onChange: handleFormPresetChange, options: A4_LABEL_PRESETS.map((p) => ({ value: p.id, label: p.label })) }), formPresetId === 'custom' && (_jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx(NumberInput, { label: "Ancho (mm)", min: 15, max: 120, emptyValue: 50, value: formWidthMm, onChange: setFormWidthMm }), _jsx(NumberInput, { label: "Alto (mm)", min: 8, max: 80, emptyValue: 25, value: formHeightMm, onChange: setFormHeightMm })] })), _jsx(NumberInput, { label: "Copias", min: 1, max: 500, emptyValue: 1, value: copies, onChange: setCopies }), _jsx(Button, { type: "button", onClick: handleAddToQueue, children: "Agregar a cola" })] })] })] }), _jsxs("section", { className: "mt-6 rounded-xl border border-surface-border bg-surface-elevated p-6", children: [_jsxs("h3", { className: "mb-1 font-medium", children: ["Vista previa \u2014 ", activeDims.widthMm, " \u00D7 ", activeDims.heightMm, " mm"] }), _jsx("p", { className: "mb-4 text-xs text-[rgb(var(--text-muted))]", children: "Misma maquetaci\u00F3n que al imprimir (HTML compartido), escalada a esta vista." }), _jsx("div", { className: "flex justify-center", children: _jsx("div", { className: "relative overflow-hidden rounded border border-surface-border bg-white shadow-sm", style: { width: previewWidthPx, height: previewHeightPx }, children: livePreviewHtml ? (_jsx("div", { className: "overflow-hidden", style: {
                                            width: labelNaturalPx.w * previewScale,
                                            height: labelNaturalPx.h * previewScale
                                        }, children: _jsx("div", { style: {
                                                width: labelNaturalPx.w,
                                                height: labelNaturalPx.h,
                                                transform: `scale(${previewScale})`,
                                                transformOrigin: 'top left'
                                            }, children: _jsx("iframe", { title: "Vista previa de etiqueta", srcDoc: livePreviewHtml, scrolling: "no", className: "pointer-events-none block border-0 bg-white", style: {
                                                    width: labelNaturalPx.w,
                                                    height: labelNaturalPx.h,
                                                    overflow: 'hidden'
                                                }, sandbox: "allow-same-origin" }) }) })) : (_jsx("p", { className: "flex h-full items-center justify-center text-xs text-[rgb(var(--text-muted))]", children: "Sin vista previa" })) }) })] }), a4ModalOpen && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-xl border border-surface-border bg-surface-elevated p-5 shadow-xl", role: "dialog", "aria-modal": "true", "aria-labelledby": "a4-print-title", children: [_jsx("h3", { id: "a4-print-title", className: "mb-4 text-lg font-semibold", children: "Imprimir en hoja A4" }), _jsxs("div", { className: "space-y-4", children: [queue.length > 0 && (_jsx(Select, { label: "Tama\u00F1o para todos", value: bulkQueuePresetId, onChange: handleApplySizeToAll, placeholder: mixedSizes ? 'Varios tamaños' : undefined, options: A4_LABEL_PRESETS.map((p) => ({ value: p.id, label: p.label })) })), bulkQueuePresetId === 'custom' && (_jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(NumberInput, { label: "Ancho (mm)", min: 15, max: 120, emptyValue: 50, value: a4WidthMm, onChange: (n) => {
                                                        setA4WidthMm(n);
                                                        setFormWidthMm(n);
                                                        applySizeToAllQueue({
                                                            presetId: 'custom',
                                                            widthMm: n,
                                                            heightMm: a4HeightMm
                                                        });
                                                    } }), _jsx(NumberInput, { label: "Alto (mm)", min: 8, max: 80, emptyValue: 25, value: a4HeightMm, onChange: (n) => {
                                                        setA4HeightMm(n);
                                                        setFormHeightMm(n);
                                                        applySizeToAllQueue({
                                                            presetId: 'custom',
                                                            widthMm: a4WidthMm,
                                                            heightMm: n
                                                        });
                                                    } })] })), mixedSizes ? (_jsxs("div", { className: "rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand", children: ["Las etiquetas de distinto tama\u00F1o se colocan en la misma hoja A4 (~", mixedA4Sheets, ' ', "hoja(s)). Use papel en blanco o para cortar; no planchas precortadas de un solo formato."] })) : (_jsxs("div", { className: "rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand", children: ["En cada hoja A4 caben ", queueA4Grid.cols, " \u00D7 ", queueA4Grid.rows, " = ", queueA4Grid.perSheet, " etiquetas de", ' ', queueA4Dims.widthMm, " \u00D7 ", queueA4Dims.heightMm, " mm. Se imprimir\u00E1n unas ", a4SheetsPreview, " hoja(s) (distribuci\u00F3n autom\u00E1tica)."] })), _jsx(Select, { label: "Impresora", value: a4Printer, onChange: setA4Printer, options: printerOptions.length > 0
                                                ? printerOptions
                                                : [{ value: '', label: loadingPrinters ? 'Cargando...' : 'Sin impresoras' }] }), _jsx("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: "Para A4 use una impresora l\u00E1ser o de inyecci\u00F3n de tinta (o \u00ABMicrosoft Print to PDF\u00BB). No use la t\u00E9rmica de rollo." })] }), _jsxs("div", { className: "mt-6 flex flex-wrap justify-end gap-2", children: [_jsx(Button, { type: "button", variant: "secondary", disabled: printing || previewing, onClick: () => setA4ModalOpen(false), children: "Cancelar" }), _jsxs(Button, { type: "button", variant: "secondary", disabled: printing || previewing || queue.length === 0, onClick: () => void handlePreviewPdf(), title: "Previsualizar PDF", "aria-label": "Previsualizar PDF", children: [_jsx(EyeIcon, {}), previewing ? 'Generando...' : 'Vista previa'] }), _jsx(Button, { type: "button", disabled: printing || !a4Printer, onClick: () => void handlePrintA4(), children: printing ? 'Imprimiendo...' : 'Imprimir' })] })] }) })), _jsxs(Modal, { open: pdfPreviewOpen, title: "Vista previa PDF", onClose: closePdfPreview, size: "xl", footer: _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "secondary", onClick: closePdfPreview, children: "Cerrar" }), _jsx(Button, { type: "button", disabled: printing, onClick: handlePrintFromPreview, children: printMode === 'a4' ? 'Continuar a imprimir' : printing ? 'Imprimiendo...' : 'Imprimir' })] }), children: [_jsx("p", { className: "mb-3 text-sm text-[rgb(var(--text-muted))]", children: pdfPreviewMeta }), pdfPreviewUrl ? (_jsx("iframe", { title: "Vista previa de etiquetas PDF", src: pdfPreviewUrl, className: "h-[70vh] w-full rounded-lg border border-surface-border bg-white" })) : (_jsx("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: "Sin documento" }))] })] }))] }));
}
