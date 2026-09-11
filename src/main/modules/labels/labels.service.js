import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { formatMoney } from '@shared/lib/currency';
import { resolveLabelDimensions } from '@shared/lib/thermal-print';
import { getDatabase } from '../../database/connection';
import { generateLabelsPdf, printLabels, printLabelsOnA4 } from '../../services/label-print.service';
import { getLabelDimensionsFromSettings } from '../../services/label-settings';
import { barcodeExists, clearLabelPrintHistory, deleteLabelPrintJob, getLabelPrintJob, insertLabelPrintJob, listLabelPrintJobs, listPreviewNamesForJobs, listItemSizeSummaryForJobs, mapJobItemPrice } from './labels.repository';
function getSetting(key, fallback = '') {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row?.value ?? fallback;
}
export function checkBarcodeService(barcode) {
    const code = barcode.trim();
    if (!code)
        return { ok: false, error: 'Código vacío' };
    const db = getDatabase();
    return { ok: true, data: { exists: barcodeExists(db, code) } };
}
function writeTempPng(base64) {
    const dir = join(tmpdir(), 'pos-labels');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `${randomUUID()}.png`);
    writeFileSync(path, Buffer.from(base64, 'base64'));
    return path;
}
function resolvePayloadDims(payload) {
    const mode = payload.mode === 'a4' ? 'a4' : 'roll';
    if (mode === 'a4' && payload.a4) {
        return {
            mode,
            dims: resolveLabelDimensions({
                presetId: payload.a4.presetId,
                widthMm: payload.a4.widthMm,
                heightMm: payload.a4.heightMm,
                dpi: 300
            })
        };
    }
    const settingsDims = getLabelDimensionsFromSettings();
    if (payload.size) {
        return {
            mode,
            dims: resolveLabelDimensions({
                presetId: payload.size.presetId,
                widthMm: payload.size.widthMm,
                heightMm: payload.size.heightMm,
                dpi: settingsDims.dpi
            })
        };
    }
    return { mode, dims: settingsDims };
}
function resolveItemDims(item, fallback, dpi) {
    if (item.presetId || item.widthMm != null || item.heightMm != null) {
        return resolveLabelDimensions({
            presetId: item.presetId ?? 'custom',
            widthMm: item.widthMm ?? fallback.widthMm,
            heightMm: item.heightMm ?? fallback.heightMm,
            dpi
        });
    }
    return fallback;
}
function buildContentsFromPayload(payload, companyName, currencySymbol, fallbackDims) {
    const tempImages = [];
    const contents = [];
    const dpi = payload.mode === 'a4' ? 300 : fallbackDims.dpi;
    for (const item of payload.items) {
        const copies = Math.max(1, Math.min(500, Math.floor(item.copies)));
        const base64 = payload.barcodeImages[item.barcode];
        if (!base64) {
            return { contents: [], tempImages, error: `Falta imagen para código ${item.barcode}` };
        }
        const imagePath = writeTempPng(base64);
        tempImages.push(imagePath);
        const priceText = item.price != null && item.price > 0 ? formatMoney(item.price, currencySymbol) : null;
        const itemDims = resolveItemDims(item, fallbackDims, dpi);
        for (let c = 0; c < copies; c++) {
            contents.push({
                companyName,
                productName: item.name,
                priceText,
                barcodeCode: item.barcode,
                barcodeImagePath: imagePath,
                dims: itemDims
            });
        }
    }
    return { contents, tempImages };
}
function cleanupTempImages(paths) {
    for (const path of paths) {
        try {
            unlinkSync(path);
        }
        catch {
            /* ignorar */
        }
    }
}
export async function printLabelsService(payload) {
    if (!payload.items?.length) {
        return { ok: false, error: 'No hay etiquetas para imprimir' };
    }
    const { mode, dims } = resolvePayloadDims(payload);
    const printerLabels = getSetting('printer_labels', '');
    const printerTicket = getSetting('printer_ticket', '');
    const currencySymbol = getSetting('currency_symbol', 'S/');
    const companyName = getSetting('company_name', '').trim() || 'Punto de Venta';
    const printerForA4 = payload.a4?.printerName?.trim() ?? '';
    if (mode === 'a4' && !printerForA4) {
        return { ok: false, error: 'Seleccione una impresora para hoja A4' };
    }
    const built = buildContentsFromPayload(payload, companyName, currencySymbol, dims);
    if (built.error) {
        cleanupTempImages(built.tempImages);
        return { ok: false, error: built.error };
    }
    try {
        let printed = built.contents.length;
        let sheets;
        if (mode === 'a4') {
            const result = await printLabelsOnA4(built.contents, printerForA4, dims);
            printed = result.printed;
            sheets = result.sheets;
        }
        else {
            const groups = new Map();
            for (const content of built.contents) {
                const itemDims = content.dims ?? dims;
                const key = `${itemDims.widthMm}x${itemDims.heightMm}@${itemDims.dpi}`;
                const list = groups.get(key) ?? [];
                list.push(content);
                groups.set(key, list);
            }
            for (const group of groups.values()) {
                await printLabels(group, printerLabels, group[0].dims ?? dims, printerTicket);
            }
        }
        try {
            const db = getDatabase();
            const dpi = mode === 'a4' ? 300 : dims.dpi;
            insertLabelPrintJob(db, {
                mode,
                labelCount: printed,
                itemCount: payload.items.length,
                sheets: sheets ?? null,
                a4PresetId: mode === 'a4'
                    ? (payload.a4?.presetId ?? payload.items[0]?.presetId ?? null)
                    : (payload.size?.presetId ?? payload.items[0]?.presetId ?? getSetting('label_preset', '50x25')),
                a4WidthMm: dims.widthMm,
                a4HeightMm: dims.heightMm,
                a4PrinterName: mode === 'a4' ? printerForA4 : null,
                items: payload.items.map((item) => {
                    const itemDims = resolveItemDims(item, dims, dpi);
                    return {
                        name: item.name,
                        barcode: item.barcode,
                        price: item.price ?? null,
                        copies: Math.max(1, Math.min(500, Math.floor(item.copies))),
                        presetId: item.presetId ?? (mode === 'a4' ? payload.a4?.presetId : payload.size?.presetId) ?? null,
                        widthMm: itemDims.widthMm,
                        heightMm: itemDims.heightMm
                    };
                })
            });
        }
        catch (histErr) {
            console.warn('[labels] No se pudo guardar historial:', histErr);
        }
        return { ok: true, data: { printed, sheets } };
    }
    catch (e) {
        return {
            ok: false,
            error: e instanceof Error ? e.message : 'Error al imprimir etiquetas'
        };
    }
    finally {
        cleanupTempImages(built.tempImages);
    }
}
export function listLabelPrintHistoryService() {
    const db = getDatabase();
    const jobs = listLabelPrintJobs(db, 300);
    const ids = jobs.map((j) => j.id);
    const names = listPreviewNamesForJobs(db, ids);
    const sizes = listItemSizeSummaryForJobs(db, ids);
    return {
        ok: true,
        data: jobs.map((j) => {
            const preview = names.get(j.id) ?? [];
            const extra = j.item_count > preview.length ? ` (+${j.item_count - preview.length})` : '';
            return {
                id: j.id,
                printedAt: j.printed_at,
                mode: j.mode,
                labelCount: j.label_count,
                itemCount: j.item_count,
                sheets: j.sheets,
                presetId: j.a4_preset_id,
                widthMm: j.a4_width_mm,
                heightMm: j.a4_height_mm,
                mixedSizes: sizes.get(j.id)?.mixed ?? false,
                previewNames: preview.join(', ') + extra
            };
        })
    };
}
export function getLabelPrintHistoryJobService(id) {
    const db = getDatabase();
    const found = getLabelPrintJob(db, id);
    if (!found)
        return { ok: false, error: 'Impresión no encontrada' };
    const { job, items } = found;
    return {
        ok: true,
        data: {
            id: job.id,
            printedAt: job.printed_at,
            mode: job.mode,
            labelCount: job.label_count,
            itemCount: job.item_count,
            sheets: job.sheets,
            a4PresetId: job.a4_preset_id,
            a4WidthMm: job.a4_width_mm,
            a4HeightMm: job.a4_height_mm,
            a4PrinterName: job.a4_printer_name,
            items: items.map((item) => ({
                id: item.id,
                name: item.name,
                barcode: item.barcode,
                price: mapJobItemPrice(item.price),
                copies: item.copies,
                presetId: item.preset_id,
                widthMm: item.width_mm,
                heightMm: item.height_mm
            }))
        }
    };
}
export function deleteLabelPrintHistoryJobService(id) {
    const db = getDatabase();
    const deleted = deleteLabelPrintJob(db, id);
    if (!deleted)
        return { ok: false, error: 'Impresión no encontrada' };
    return { ok: true, data: { deleted: true } };
}
export function clearLabelPrintHistoryService() {
    const db = getDatabase();
    const deleted = clearLabelPrintHistory(db);
    return { ok: true, data: { deleted } };
}
export async function previewLabelsPdfService(payload) {
    if (!payload.items?.length) {
        return { ok: false, error: 'No hay etiquetas para previsualizar' };
    }
    const { mode, dims } = resolvePayloadDims(payload);
    const currencySymbol = getSetting('currency_symbol', 'S/');
    const companyName = getSetting('company_name', '').trim() || 'Punto de Venta';
    const built = buildContentsFromPayload(payload, companyName, currencySymbol, dims);
    if (built.error) {
        cleanupTempImages(built.tempImages);
        return { ok: false, error: built.error };
    }
    try {
        const { pdf, sheets } = await generateLabelsPdf(built.contents, dims, mode);
        return {
            ok: true,
            data: {
                pdfBase64: pdf.toString('base64'),
                labelCount: built.contents.length,
                sheets: mode === 'a4' ? sheets : undefined,
                widthMm: mode === 'a4' ? dims.widthMm : dims.widthMm,
                heightMm: mode === 'a4' ? dims.heightMm : dims.heightMm,
                mode
            }
        };
    }
    catch (e) {
        return {
            ok: false,
            error: e instanceof Error ? e.message : 'Error al generar vista previa'
        };
    }
    finally {
        cleanupTempImages(built.tempImages);
    }
}
