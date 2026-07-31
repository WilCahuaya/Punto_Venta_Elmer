import {
  isCompactLabel,
  labelBarcodeMaxWidthMm,
  resolveLabelContentLayout,
  type LabelDimensions
} from './thermal-print'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** CSS de una etiqueta (mismo layout para impresión y vista previa). */
export function buildLabelCellCss(dims: LabelDimensions): string {
  const layout = resolveLabelContentLayout(dims, 'Producto')
  const { widthMm, heightMm } = dims
  const fonts = layout.nameFonts
  const compact = isCompactLabel(widthMm, heightMm)
  const stackGap = compact ? '0.05mm' : '0.12mm'
  const codeGap = compact ? '0.35mm' : '0.55mm'

  return [
    `    .label { width: ${widthMm}mm; height: ${heightMm}mm; display: flex; flex-direction: column;`,
    `      justify-content: flex-start; align-items: stretch; gap: ${stackGap};`,
    `      padding: ${layout.padding}; overflow: hidden; box-sizing: border-box; }`,
    '    .name { flex: 0 0 auto; text-align: center; font-weight: 700; line-height: 1.02; overflow: hidden;',
    `      display: -webkit-box; -webkit-line-clamp: ${layout.nameLines}; -webkit-box-orient: vertical;`,
    '      word-break: break-word; hyphens: auto; }',
    `    .name.size-lg { font-size: ${fonts.lg}; }`,
    `    .name.size-md { font-size: ${fonts.md}; }`,
    `    .name.size-sm { font-size: ${fonts.sm}; }`,
    `    .price { flex: 0 0 auto; text-align: center; font-size: ${layout.priceFont}; font-weight: 800;`,
    '      line-height: 1; margin: 0; white-space: nowrap; }',
    '    .barcode-wrap { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column;',
    `      justify-content: flex-start; gap: ${codeGap}; overflow: hidden; }`,
    '    .barcode-bars { flex: 1 1 auto; min-height: 0; display: flex; align-items: stretch;',
    '      justify-content: center; overflow: hidden; }',
    '    .barcode-bars img { display: block; width: 100%; height: 100%; object-fit: fill;',
    '      image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; }',
    '    .barcode-code { flex: 0 0 auto; text-align: center; font-family: "Courier New", Courier, monospace;',
    '      font-weight: 700; letter-spacing: 0.05mm; line-height: 1;',
    '      margin: 0; padding: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }'
  ].join('\n')
}

export interface LabelHtmlContent {
  productName: string
  priceText: string | null
  barcodeCode: string
  /** src de imagen (file:// o data:image/png;base64,...) */
  barcodeSrc: string
}

/** Celda HTML de una etiqueta (contenido). */
export function buildLabelCellHtml(content: LabelHtmlContent, dims: LabelDimensions): string {
  const rawName = content.productName.trim() || 'Producto'
  const layout = resolveLabelContentLayout(dims, rawName)
  const name = escapeHtml(truncate(rawName, layout.nameMaxChars))
  const price = content.priceText ? escapeHtml(content.priceText) : ''
  const code = escapeHtml(content.barcodeCode.trim())
  const barcodeMaxW = `${labelBarcodeMaxWidthMm(dims.widthMm)}mm`

  const barcodeImg = content.barcodeSrc
    ? `      <img src="${content.barcodeSrc}" alt="" style="max-width:${barcodeMaxW}" />`
    : ''

  return [
    `<div class="label">`,
    `  <div class="name ${layout.nameClass}">${name}</div>`,
    price ? `  <div class="price">${price}</div>` : '',
    `  <div class="barcode-wrap">`,
    `    <div class="barcode-bars">`,
    barcodeImg,
    `    </div>`,
    code ? `    <p class="barcode-code" style="font-size:${layout.codeFont}">${code}</p>` : '',
    `  </div>`,
    `</div>`
  ]
    .filter(Boolean)
    .join('\n')
}

/** Documento HTML de una sola etiqueta (rollo / vista previa). */
export function buildSingleLabelDocumentHtml(
  content: LabelHtmlContent,
  dims: LabelDimensions
): string {
  const { widthMm, heightMm } = dims
  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '  <meta charset="utf-8">',
    '  <style>',
    `    @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`,
    '    * { box-sizing: border-box; margin: 0; padding: 0; }',
    `    html, body { margin: 0; padding: 0; background: #fff; width: ${widthMm}mm; height: ${heightMm}mm;`,
    '      overflow: hidden; font-family: Arial, Helvetica, sans-serif; color: #000;',
    '      -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    buildLabelCellCss(dims),
    '    .label { page-break-after: auto; overflow: hidden; }',
    '  </style>',
    '</head>',
    '<body>',
    buildLabelCellHtml(content, dims),
    '</body>',
    '</html>'
  ].join('\n')
}
