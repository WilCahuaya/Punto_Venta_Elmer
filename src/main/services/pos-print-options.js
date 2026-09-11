import { ESC_POS_PRINTABLE_WIDTH_DOTS, ESC_POS_RASTER_Y_SCALE, PAPER_WIDTH_PX, PAPER_PRINTABLE_WIDTH_PX, parseThermalPaperSize } from '@shared/lib/thermal-print';
export { ESC_POS_PRINTABLE_WIDTH_DOTS, ESC_POS_RASTER_Y_SCALE, PAPER_WIDTH_PX, PAPER_PRINTABLE_WIDTH_PX, parseThermalPaperSize };
/** Estima alto del contenido en px para preconfigurar la ventana de impresión. */
export function estimatePrintHeightPx(data) {
    let height = 8;
    for (const row of data) {
        if (row.type === 'image') {
            height += typeof row.height === 'number' ? row.height + 4 : 60;
            continue;
        }
        const fs = row.style?.fontSize;
        let linePx = 14;
        if (typeof fs === 'string') {
            const match = fs.match(/(\d+(?:\.\d+)?)/);
            if (match)
                linePx = Math.ceil(Number.parseFloat(match[1]) * 1.25);
        }
        height += linePx;
    }
    return Math.min(12000, Math.max(64, height + 8));
}
/**
 * Opciones para electron-pos-printer.
 * Usar pageSize como string ('80mm') para que la librería calcule el alto real del contenido.
 */
export function buildPosPrintOptions(printerName, data, paperSize = '58mm') {
    return {
        printerName: printerName || undefined,
        preview: false,
        pageSize: paperSize,
        margin: '0 0 0 0',
        margins: { marginType: 'none' },
        copies: 1,
        timeOutPerLine: 600,
        silent: true,
        printBackground: true,
        color: false
    };
}
