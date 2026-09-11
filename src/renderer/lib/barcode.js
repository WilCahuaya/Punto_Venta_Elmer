import JsBarcode from 'jsbarcode';
/** Solo barras (el número se imprime aparte, más grande y legible). */
export const LABEL_BARCODE_OPTIONS = {
    width: 2,
    height: 58,
    fontSize: 6,
    displayValue: false,
    margin: 0
};
/** Opciones compactas para etiquetas pequeñas (p. ej. 25 × 12 mm en A4). */
export function labelBarcodeOptionsForHeight(heightMm) {
    if (heightMm <= 14) {
        return { width: 1, height: 28, fontSize: 5, displayValue: false, margin: 0 };
    }
    if (heightMm <= 22) {
        return { width: 1, height: 40, fontSize: 6, displayValue: false, margin: 0 };
    }
    return LABEL_BARCODE_OPTIONS;
}
/** Genera PNG en base64 (sin prefijo data:) para impresión. */
export async function barcodeToBase64(code, options = {}) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, code, {
        format: 'CODE128',
        width: options.width ?? 2,
        height: options.height ?? 50,
        fontSize: options.fontSize ?? 14,
        displayValue: options.displayValue ?? true,
        margin: options.margin ?? 4,
        textMargin: 0,
        lineColor: '#000000'
    });
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
        const img = await loadImage(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('Canvas no disponible');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        return dataUrl.replace(/^data:image\/png;base64,/, '');
    }
    finally {
        URL.revokeObjectURL(url);
    }
}
/** Igual que barcodeToBase64 pero no lanza: un código inválido no tumba el lote. */
export async function barcodeToBase64Safe(code, options = {}) {
    try {
        return await barcodeToBase64(code, options);
    }
    catch {
        return null;
    }
}
export async function barcodesToBase64Map(codes, options = {}) {
    const images = {};
    const failed = [];
    const unique = [...new Set(codes.map((c) => c.trim()).filter(Boolean))];
    for (const code of unique) {
        const png = await barcodeToBase64Safe(code, options);
        if (png)
            images[code] = png;
        else
            failed.push(code);
    }
    return { images, failed };
}
/** Renderiza código de barras en un elemento SVG del DOM (vista previa). */
export function renderBarcodeSvg(element, code, options) {
    JsBarcode(element, code, {
        format: 'CODE128',
        width: options?.width ?? 2,
        height: options?.height ?? 60,
        fontSize: options?.fontSize ?? 14,
        displayValue: options?.displayValue ?? true,
        margin: options?.margin ?? 6,
        textMargin: 0,
        lineColor: '#000000'
    });
}
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Error al renderizar código de barras'));
        img.src = src;
    });
}
