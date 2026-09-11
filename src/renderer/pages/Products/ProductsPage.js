import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeScannedBarcode } from '@shared/lib/product-barcode';
import { DOZEN_UNITS, packSalePrice } from '@shared/lib/product-packs';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { Select } from '../../components/ui/Select';
import { ProductFormModal } from '../../features/products/ProductFormModal';
import { ScanCreatePromptModal } from '../../features/products/ScanCreatePromptModal';
import { ScanStockSuccessModal } from '../../features/products/ScanStockSuccessModal';
import { StockAdjustModal } from '../../features/products/StockAdjustModal';
import { useProductImage } from '../../hooks/useProductImage';
import { buildCategorySelectOptions } from '../../lib/category-options';
function ProductThumb({ imagePath }) {
    const url = useProductImage(imagePath);
    return (_jsx("div", { className: "flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-surface-border bg-surface", children: url ? (_jsx("img", { src: url, alt: "", className: "h-full w-full object-cover" })) : (_jsx("span", { className: "text-[10px] text-[rgb(var(--text-muted))]", children: "\u2014" })) }));
}
export function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [includeInactive, setIncludeInactive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [stockProduct, setStockProduct] = useState(null);
    const [createBarcode, setCreateBarcode] = useState(undefined);
    const [scanMsg, setScanMsg] = useState(null);
    const [scanCreatePrompt, setScanCreatePrompt] = useState(null);
    const [scanStockSuccess, setScanStockSuccess] = useState(null);
    const scannerRef = useRef(null);
    const [scanBuffer, setScanBuffer] = useState('');
    const loadCategories = useCallback(async () => {
        const result = await window.api.categories.list({ includeInactive: false });
        if (result.ok)
            setCategories(result.data);
    }, []);
    const loadProducts = useCallback(async () => {
        setLoading(true);
        const result = await window.api.products.list({
            search: search || undefined,
            categoryId: categoryId ? Number(categoryId) : undefined,
            lowStockOnly,
            includeInactive
        });
        if (result.ok)
            setProducts(result.data);
        setLoading(false);
    }, [search, categoryId, lowStockOnly, includeInactive]);
    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);
    useEffect(() => {
        void loadProducts();
    }, [loadProducts]);
    useEffect(() => {
        if (modalOpen || stockProduct || scanCreatePrompt || scanStockSuccess)
            return;
        scannerRef.current?.focus();
    }, [modalOpen, stockProduct, scanCreatePrompt, scanStockSuccess]);
    async function handleScannerEnter(code) {
        const trimmed = normalizeScannedBarcode(code.trim());
        if (!trimmed)
            return;
        setScanMsg(null);
        const res = await window.api.products.lookupBarcode(trimmed);
        if (!res.ok) {
            setScanCreatePrompt(trimmed);
            return;
        }
        const previousStock = res.data.stock;
        const adjust = await window.api.products.adjustStock({
            productId: res.data.id,
            stock: previousStock + 1
        });
        if (!adjust.ok) {
            setScanMsg(adjust.error);
            return;
        }
        setScanStockSuccess({ product: adjust.data, previousStock });
        void loadProducts();
    }
    function handleScanCreateConfirm() {
        if (!scanCreatePrompt)
            return;
        setEditing(null);
        setCreateBarcode(scanCreatePrompt);
        setScanCreatePrompt(null);
        setModalOpen(true);
    }
    function openCreate() {
        setEditing(null);
        setCreateBarcode(undefined);
        setModalOpen(true);
    }
    function handleScanKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            void handleScannerEnter(scanBuffer);
            setScanBuffer('');
        }
    }
    function openEdit(p) {
        setEditing(p);
        setModalOpen(true);
    }
    async function handleDeactivate(p) {
        if (!confirm(`¿Desactivar el producto "${p.name}"?\n\nQuedará inactivo. Para borrarlo de la base de datos deberá eliminarlo después.`)) {
            return;
        }
        const result = await window.api.products.deactivate(p.id);
        if (!result.ok)
            alert(result.error);
        else
            void loadProducts();
    }
    async function handleDestroy(p) {
        if (!confirm(`¿Eliminar definitivamente "${p.name}" de la base de datos?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }
        const result = await window.api.products.destroy(p.id);
        if (!result.ok)
            alert(result.error);
        else
            void loadProducts();
    }
    const categoryFilterOptions = buildCategorySelectOptions(categories);
    const lowStockCount = products.filter((p) => p.isLowStock && p.isActive).length;
    return (_jsxs("div", { children: [_jsxs("header", { className: "mb-6 flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-semibold", children: "Productos" }), _jsxs("p", { className: "text-sm text-[rgb(var(--text-muted))]", children: [products.length, " producto(s)", lowStockOnly && lowStockCount > 0 && (_jsxs("span", { className: "ml-2 text-amber-600", children: ["\u00B7 ", lowStockCount, " con stock bajo"] }))] })] }), _jsx(Button, { onClick: openCreate, children: "+ Nuevo producto" })] }), _jsxs("div", { className: "mb-4 rounded-xl border border-brand/30 bg-brand/5 p-3", children: [_jsx("label", { className: "mb-1 block text-xs font-medium text-[rgb(var(--text-muted))]", children: "Lector de barras \u2014 escanee para sumar stock o registrar producto nuevo" }), _jsx("input", { ref: scannerRef, type: "text", value: scanBuffer, onChange: (e) => setScanBuffer(e.target.value), onKeyDown: handleScanKeyDown, placeholder: "Escanee el c\u00F3digo de barras del producto", autoComplete: "off", className: "w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 font-mono text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" }), scanMsg && _jsx("p", { className: "mt-2 text-sm text-red-500", children: scanMsg })] }), _jsxs("div", { className: "mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [_jsx(Input, { label: "Buscar", placeholder: "Nombre, c\u00F3digo o barras...", value: search, onChange: (e) => setSearch(e.target.value) }), _jsx(Select, { label: "Categor\u00EDa", value: categoryId, onChange: setCategoryId, options: categoryFilterOptions, placeholder: "Todas" }), _jsxs("label", { className: "flex items-center gap-2 self-end pb-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: lowStockOnly, onChange: (e) => setLowStockOnly(e.target.checked) }), "Solo stock bajo"] }), _jsxs("label", { className: "flex items-center gap-2 self-end pb-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: includeInactive, onChange: (e) => setIncludeInactive(e.target.checked) }), "Mostrar inactivos"] })] }), _jsx("div", { className: "overflow-x-auto rounded-xl border border-surface-border", children: _jsxs("table", { className: "w-full min-w-[900px] text-left text-sm", children: [_jsx("thead", { className: "border-b border-surface-border bg-surface-elevated", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-3 font-medium", children: "Img" }), _jsx("th", { className: "px-3 py-3 font-medium", children: "Producto" }), _jsx("th", { className: "px-3 py-3 font-medium", children: "Categor\u00EDa" }), _jsx("th", { className: "px-3 py-3 font-medium", children: "Stock" }), _jsx("th", { className: "px-3 py-3 font-medium", children: "Menor" }), _jsx("th", { className: "px-3 py-3 font-medium", children: "Mayor" }), _jsx("th", { className: "px-3 py-3 font-medium", children: "Estado" }), _jsx("th", { className: "px-3 py-3 font-medium text-right", children: "Acciones" })] }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "px-4 py-8 text-center text-[rgb(var(--text-muted))]", children: "Cargando..." }) })) : products.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "px-4 py-8 text-center text-[rgb(var(--text-muted))]", children: "Sin productos" }) })) : (products.map((p) => (_jsxs("tr", { className: "border-b border-surface-border/60 hover:bg-surface-elevated/50", children: [_jsx("td", { className: "px-3 py-2", children: _jsx(ProductThumb, { imagePath: p.imagePath }) }), _jsxs("td", { className: "px-3 py-2", children: [_jsx("div", { className: "font-medium", children: p.name }), p.productCode && (_jsx("div", { className: "text-xs text-[rgb(var(--text-muted))]", children: p.productCode })), p.barcode && (_jsx("div", { className: "font-mono text-xs text-[rgb(var(--text-muted))]", children: p.barcode })), (p.size || p.color || p.brand) && (_jsx("div", { className: "text-xs text-[rgb(var(--text-muted))]", children: [p.brand, p.size, p.color].filter(Boolean).join(' · ') }))] }), _jsx("td", { className: "px-3 py-2", children: p.categoryName ?? '—' }), _jsxs("td", { className: "px-3 py-2", children: [_jsx("span", { className: p.isLowStock ? 'font-medium text-amber-600' : '', children: p.stock }), p.isLowStock && (_jsx("span", { className: "ml-1", children: _jsx(Badge, { variant: "warning", children: "Bajo" }) }))] }), _jsx("td", { className: "px-3 py-2", children: _jsx(MoneyDisplay, { amount: p.priceRetail, size: "sm" }) }), _jsxs("td", { className: "px-3 py-2", children: [p.priceWholesale != null ? (_jsx(MoneyDisplay, { amount: p.priceWholesale, size: "sm" })) : (_jsx("span", { className: "text-[rgb(var(--text-muted))]", children: "\u2014" })), (p.priceDozen != null ||
                                                p.pricePlancha != null ||
                                                p.priceCajon != null) && (_jsxs("div", { className: "mt-1 space-y-0.5 text-[11px] text-[rgb(var(--text-muted))]", children: [p.priceDozen != null && (_jsxs("div", { children: ["Docena (", DOZEN_UNITS, "):", ' ', _jsx(MoneyDisplay, { amount: packSalePrice(p.priceDozen, DOZEN_UNITS), size: "sm" })] })), p.pricePlancha != null && p.planchaQty != null && (_jsxs("div", { children: ["Plancha (", p.planchaQty, "):", ' ', _jsx(MoneyDisplay, { amount: packSalePrice(p.pricePlancha, p.planchaQty), size: "sm" })] })), p.priceCajon != null && p.cajonQty != null && (_jsxs("div", { children: ["Caj\u00F3n (", p.cajonQty, "):", ' ', _jsx(MoneyDisplay, { amount: packSalePrice(p.priceCajon, p.cajonQty), size: "sm" })] }))] }))] }), _jsx("td", { className: "px-3 py-2", children: _jsx(Badge, { variant: p.isActive ? 'success' : 'muted', children: p.isActive ? 'Activo' : 'Inactivo' }) }), _jsx("td", { className: "px-3 py-2 text-right", children: _jsxs("div", { className: "flex justify-end gap-1", children: [_jsx(Button, { variant: "ghost", type: "button", onClick: () => setStockProduct(p), children: "Stock" }), _jsx(Button, { variant: "ghost", type: "button", onClick: () => openEdit(p), children: "Editar" }), p.isActive ? (_jsx(Button, { variant: "ghost", type: "button", onClick: () => void handleDeactivate(p), children: "Desactivar" })) : (_jsx(Button, { variant: "danger", type: "button", onClick: () => void handleDestroy(p), children: "Eliminar" }))] }) })] }, p.id)))) })] }) }), _jsx(ScanCreatePromptModal, { open: !!scanCreatePrompt, barcode: scanCreatePrompt ?? '', onClose: () => {
                    setScanCreatePrompt(null);
                    setScanBuffer('');
                }, onCreate: handleScanCreateConfirm }), _jsx(ScanStockSuccessModal, { open: !!scanStockSuccess, product: scanStockSuccess?.product ?? null, previousStock: scanStockSuccess?.previousStock ?? 0, onClose: () => {
                    setScanStockSuccess(null);
                    setScanBuffer('');
                }, onAdjustMore: () => {
                    if (scanStockSuccess)
                        setStockProduct(scanStockSuccess.product);
                    setScanStockSuccess(null);
                } }), _jsx(ProductFormModal, { open: modalOpen, product: editing, categories: categories, initialBarcode: createBarcode, onClose: () => {
                    setModalOpen(false);
                    setCreateBarcode(undefined);
                }, onSaved: () => void loadProducts() }), _jsx(StockAdjustModal, { open: !!stockProduct, product: stockProduct, onClose: () => {
                    setStockProduct(null);
                    setScanBuffer('');
                }, onSaved: () => void loadProducts() })] }));
}
