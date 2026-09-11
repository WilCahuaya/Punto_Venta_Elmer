/**
 * Ancho en píxeles lógicos @ ~96 DPI (CSS) para preview HTML / electron-pos-printer.
 * 80mm ≈ 80/25.4*96 = 302 px — no confundir con dots ESC/POS.
 */
export const TICKET_WIDTH_PX = {
    '58mm': 219,
    '80mm': 302
};
/** Alias histórico. */
export const PAPER_WIDTH_PX = TICKET_WIDTH_PX;
/** Ancho útil imprimible en px CSS (márgenes ~8 px c/u). */
export const TICKET_PRINTABLE_WIDTH_PX = {
    '58mm': TICKET_WIDTH_PX['58mm'] - 16,
    '80mm': TICKET_WIDTH_PX['80mm'] - 16
};
export const PAPER_PRINTABLE_WIDTH_PX = TICKET_PRINTABLE_WIDTH_PX;
/**
 * Ancho imprimible ESC/POS en dots @ 203 DPI (8 dots/mm).
 * Es el tamaño real al enviar raster GS v 0 por USB RAW.
 */
export const ESC_POS_PRINTABLE_WIDTH_DOTS = {
    '58mm': 384,
    '80mm': 576
};
/**
 * Compensa DPI vertical distinto en muchas POS-80 (círculos → óvalos anchos).
 * 203/180 ≈ 1.128
 */
export const ESC_POS_RASTER_Y_SCALE = 203 / 180;
export const LABEL_DPI_OPTIONS = [203, 300];
/** Tamaños de etiqueta autoadhesiva habituales en impresoras térmicas. */
export const LABEL_PRESETS = [
    { id: '50x25', label: '50 × 25 mm (estándar)', widthMm: 50, heightMm: 25 },
    { id: '40x30', label: '40 × 30 mm', widthMm: 40, heightMm: 30 },
    { id: '60x40', label: '60 × 40 mm', widthMm: 60, heightMm: 40 },
    { id: '30x20', label: '30 × 20 mm', widthMm: 30, heightMm: 20 },
    { id: '30x15', label: '30 × 15 mm (joyería)', widthMm: 30, heightMm: 15 },
    { id: '25x12', label: '25 × 12 mm (joyería chica)', widthMm: 25, heightMm: 12 },
    { id: '20x10', label: '20 × 10 mm (joyería micro)', widthMm: 20, heightMm: 10 },
    { id: '40x15', label: '40 × 15 mm (joyería)', widthMm: 40, heightMm: 15 },
    { id: 'custom', label: 'Personalizado', widthMm: 50, heightMm: 25 }
];
export function parseThermalPaperSize(value) {
    return value === '80mm' ? '80mm' : '58mm';
}
export function parseLabelDpi(value) {
    return value === '300' ? 300 : 203;
}
export function mmToMicrons(mm) {
    return Math.round(mm * 1000);
}
export function clampLabelMm(value, min, max) {
    if (!Number.isFinite(value))
        return min;
    return Math.min(max, Math.max(min, Math.round(value)));
}
export function resolveLabelDimensions(input) {
    const preset = LABEL_PRESETS.find((p) => p.id === input.presetId) ?? LABEL_PRESETS[0];
    const widthMm = preset.id === 'custom'
        ? clampLabelMm(input.widthMm ?? preset.widthMm, 15, 120)
        : preset.widthMm;
    const heightMm = preset.id === 'custom'
        ? clampLabelMm(input.heightMm ?? preset.heightMm, 8, 80)
        : preset.heightMm;
    const dpi = parseLabelDpi(String(input.dpi ?? 203));
    return { widthMm, heightMm, dpi };
}
/** Etiqueta compacta (joyería / muy pequeña). */
export function isCompactLabel(widthMm, heightMm) {
    return heightMm <= 16 || widthMm <= 28 || widthMm * heightMm <= 480;
}
export function labelBarcodeMaxWidthMm(widthMm) {
    return Math.max(10, Math.round((widthMm - 1.5) * 10) / 10);
}
/** Alto útil de barras según alto de etiqueta y si lleva precio. */
export function labelBarcodeBarsMaxMm(heightMm, hasPrice) {
    const compact = heightMm <= 16;
    const ratio = compact ? (hasPrice ? 0.42 : 0.52) : hasPrice ? 0.58 : 0.68;
    const minBars = compact ? Math.max(3.5, heightMm * 0.28) : 8;
    return Math.max(minBars, Math.round(heightMm * ratio * 10) / 10);
}
/** Tipografía y límites para que el contenido quepa en el tamaño elegido. */
export function resolveLabelContentLayout(dims, productName) {
    const { widthMm, heightMm } = dims;
    const compact = isCompactLabel(widthMm, heightMm);
    const jewelry = heightMm <= 16;
    const len = productName.trim().length;
    let nameFonts;
    let priceFont;
    let codeFont;
    let padding;
    let nameMaxChars;
    let nameLines;
    if (jewelry || heightMm <= 14) {
        nameFonts = { lg: '1.55mm', md: '1.35mm', sm: '1.15mm' };
        priceFont = '1.4mm';
        codeFont = widthMm <= 28 ? '1.3mm' : '1.5mm';
        padding = '0.2mm 0.5mm 0.15mm';
        nameMaxChars = widthMm <= 28 ? 28 : 36;
        nameLines = 1;
    }
    else if (compact || widthMm <= 35) {
        nameFonts = { lg: '2.0mm', md: '1.75mm', sm: '1.5mm' };
        priceFont = '1.9mm';
        codeFont = '2.0mm';
        padding = '0.35mm 0.8mm 0.2mm';
        nameMaxChars = widthMm <= 32 ? 40 : 52;
        nameLines = heightMm >= 18 ? 2 : 1;
    }
    else if (widthMm >= 55) {
        nameFonts = { lg: '2.8mm', md: '2.3mm', sm: '2mm' };
        priceFont = '2.3mm';
        codeFont = '2.8mm';
        padding = '0.5mm 1.2mm 0.25mm';
        nameMaxChars = 80;
        nameLines = 2;
    }
    else {
        nameFonts = { lg: '2.5mm', md: '2.1mm', sm: '1.85mm' };
        priceFont = '2.3mm';
        codeFont = '2.6mm';
        padding = '0.5mm 1.2mm 0.25mm';
        nameMaxChars = 70;
        nameLines = 2;
    }
    const short = widthMm <= 35 || jewelry;
    let nameClass = 'size-sm';
    if (len <= (short ? 12 : 18))
        nameClass = 'size-lg';
    else if (len <= (short ? 22 : 32))
        nameClass = 'size-md';
    return {
        padding,
        nameMaxChars,
        nameLines,
        nameFonts,
        priceFont,
        codeFont,
        nameClass
    };
}
/** Presets para hoja A4 (incluye personalizado). */
export const A4_LABEL_PRESETS = LABEL_PRESETS;
export const A4_PAGE_WIDTH_MM = 210;
export const A4_PAGE_HEIGHT_MM = 297;
/** Márgenes de hoja y separación entre etiquetas (mm). */
export const A4_MARGIN_MM = 4;
export const A4_GAP_MM = 0.5;
/** Cuántas etiquetas caben por hoja A4 con el tamaño dado. */
export function computeA4LabelGrid(widthMm, heightMm) {
    const usableW = A4_PAGE_WIDTH_MM - A4_MARGIN_MM * 2;
    const usableH = A4_PAGE_HEIGHT_MM - A4_MARGIN_MM * 2;
    const cols = Math.max(1, Math.floor((usableW + A4_GAP_MM) / (widthMm + A4_GAP_MM)));
    const rows = Math.max(1, Math.floor((usableH + A4_GAP_MM) / (heightMm + A4_GAP_MM)));
    return {
        cols,
        rows,
        perSheet: cols * rows,
        widthMm,
        heightMm
    };
}
export function a4SheetsNeeded(labelCount, perSheet) {
    if (labelCount <= 0 || perSheet <= 0)
        return 0;
    return Math.ceil(labelCount / perSheet);
}
export function a4UsableSizeMm() {
    return {
        widthMm: A4_PAGE_WIDTH_MM - A4_MARGIN_MM * 2,
        heightMm: A4_PAGE_HEIGHT_MM - A4_MARGIN_MM * 2
    };
}
function roundPackMm(n) {
    return Math.round(n * 100) / 100;
}
function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function splitFreeRect(rect, used) {
    if (!rectsOverlap(rect, used))
        return [rect];
    const out = [];
    if (used.x > rect.x) {
        out.push({ x: rect.x, y: rect.y, w: used.x - rect.x, h: rect.h });
    }
    const usedRight = used.x + used.w;
    const rectRight = rect.x + rect.w;
    if (usedRight < rectRight) {
        out.push({ x: usedRight, y: rect.y, w: rectRight - usedRight, h: rect.h });
    }
    if (used.y > rect.y) {
        out.push({ x: rect.x, y: rect.y, w: rect.w, h: used.y - rect.y });
    }
    const usedBottom = used.y + used.h;
    const rectBottom = rect.y + rect.h;
    if (usedBottom < rectBottom) {
        out.push({ x: rect.x, y: usedBottom, w: rect.w, h: rectBottom - usedBottom });
    }
    return out.filter((r) => r.w >= 0.5 && r.h >= 0.5);
}
function pruneFreeRects(rects) {
    const kept = [];
    for (let i = 0; i < rects.length; i++) {
        const a = rects[i];
        let contained = false;
        for (let j = 0; j < rects.length; j++) {
            if (i === j)
                continue;
            const b = rects[j];
            const inside = a.x >= b.x - 0.01 &&
                a.y >= b.y - 0.01 &&
                a.x + a.w <= b.x + b.w + 0.01 &&
                a.y + a.h <= b.y + b.h + 0.01;
            if (!inside)
                continue;
            const same = Math.abs(a.x - b.x) < 0.01 &&
                Math.abs(a.y - b.y) < 0.01 &&
                Math.abs(a.w - b.w) < 0.01 &&
                Math.abs(a.h - b.h) < 0.01;
            if (same && i > j) {
                contained = true;
                break;
            }
            if (!same) {
                contained = true;
                break;
            }
        }
        if (!contained)
            kept.push(a);
    }
    return kept;
}
function findBestFit(free, widthMm, heightMm) {
    let best = null;
    let bestShort = Infinity;
    let bestLong = Infinity;
    for (const rect of free) {
        if (rect.w + 0.01 < widthMm || rect.h + 0.01 < heightMm)
            continue;
        const leftoverW = rect.w - widthMm;
        const leftoverH = rect.h - heightMm;
        const short = Math.min(leftoverW, leftoverH);
        const long = Math.max(leftoverW, leftoverH);
        if (short < bestShort - 0.01 || (Math.abs(short - bestShort) < 0.01 && long < bestLong)) {
            best = rect;
            bestShort = short;
            bestLong = long;
        }
    }
    return best;
}
function placeOnSheet(free, x, y, widthMm, heightMm) {
    const used = {
        x,
        y,
        w: widthMm + A4_GAP_MM,
        h: heightMm + A4_GAP_MM
    };
    const split = [];
    for (const rect of free) {
        split.push(...splitFreeRect(rect, used));
    }
    return pruneFreeRects(split);
}
/**
 * Coloca etiquetas de distinto tamaño en hojas A4 (MaxRects / best short side).
 * Las coordenadas son relativas al área útil (después del margen).
 */
export function packA4Labels(sizes) {
    if (sizes.length === 0)
        return { placements: [], sheets: 0 };
    const usable = a4UsableSizeMm();
    const order = sizes
        .map((size, index) => ({
        index,
        widthMm: roundPackMm(size.widthMm),
        heightMm: roundPackMm(size.heightMm)
    }))
        .sort((a, b) => b.heightMm - a.heightMm || b.widthMm - a.widthMm || a.index - b.index);
    const sheets = [];
    const placements = [];
    function addSheet() {
        sheets.push([{ x: 0, y: 0, w: usable.widthMm, h: usable.heightMm }]);
        return sheets.length - 1;
    }
    addSheet();
    for (const item of order) {
        const widthMm = Math.min(item.widthMm, usable.widthMm);
        const heightMm = Math.min(item.heightMm, usable.heightMm);
        let placed = false;
        for (let sheet = 0; sheet < sheets.length; sheet++) {
            const fit = findBestFit(sheets[sheet], widthMm, heightMm);
            if (!fit)
                continue;
            const x = roundPackMm(fit.x);
            const y = roundPackMm(fit.y);
            sheets[sheet] = placeOnSheet(sheets[sheet], x, y, widthMm, heightMm);
            placements.push({
                index: item.index,
                sheet,
                xMm: x,
                yMm: y,
                widthMm,
                heightMm
            });
            placed = true;
            break;
        }
        if (!placed) {
            const sheet = addSheet();
            const x = 0;
            const y = 0;
            sheets[sheet] = placeOnSheet(sheets[sheet], x, y, widthMm, heightMm);
            placements.push({
                index: item.index,
                sheet,
                xMm: x,
                yMm: y,
                widthMm,
                heightMm
            });
        }
    }
    placements.sort((a, b) => a.sheet - b.sheet || a.index - b.index);
    return { placements, sheets: sheets.length };
}
export function a4SheetsNeededMixed(sizes) {
    return packA4Labels(sizes).sheets;
}
