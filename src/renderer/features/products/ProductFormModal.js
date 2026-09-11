import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { deriveBarcodeFromCatalog, normalizeScannedBarcode } from '@shared/lib/product-barcode';
import { DOZEN_UNITS, packSalePrice } from '@shared/lib/product-packs';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { MoneyDisplay } from '../../components/ui/MoneyDisplay';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { NumberInput } from '../../components/ui/NumberInput';
import { Select } from '../../components/ui/Select';
import { useProductImage } from '../../hooks/useProductImage';
import { buildCategorySelectOptions } from '../../lib/category-options';
function defaultForm() {
    return {
        name: '',
        barcode: '',
        categoryId: null,
        stock: 0,
        stockMin: 0,
        brand: '',
        size: '',
        color: '',
        description: '',
        costPrice: 0,
        priceRetail: 0,
        priceWholesale: null,
        priceDozen: null,
        planchaQty: null,
        pricePlancha: null,
        cajonQty: null,
        priceCajon: null,
        isActive: true
    };
}
function FormSection({ title, children }) {
    return (_jsxs("section", { className: "rounded-xl border border-surface-border p-4", children: [_jsx("h3", { className: "mb-4 text-sm font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]", children: title }), _jsx("div", { className: "space-y-4", children: children })] }));
}
function PackTotalHint({ units, unitPrice, emptyText }) {
    const qty = units ?? 0;
    const price = unitPrice ?? 0;
    if (qty > 0 && price > 0) {
        const total = packSalePrice(price, qty);
        return (_jsxs("p", { className: "mt-1 text-xs text-[rgb(var(--text-muted))]", children: ["Al vender se cobra ", _jsx(MoneyDisplay, { amount: price, size: "sm", className: "inline text-xs" }), " \u00D7", ' ', qty, " =", ' ', _jsx(MoneyDisplay, { amount: total, size: "sm", className: "inline text-xs font-medium" })] }));
    }
    return _jsx("p", { className: "mt-1 text-xs text-[rgb(var(--text-muted))]", children: emptyText });
}
export function ProductFormModal({ open, product, categories, initialBarcode, onClose, onSaved }) {
    const [form, setForm] = useState(defaultForm());
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [pendingImagePath, setPendingImagePath] = useState(null);
    const [previewLocalUrl, setPreviewLocalUrl] = useState(null);
    const [removeImage, setRemoveImage] = useState(false);
    const storedImageUrl = useProductImage(product?.imagePath);
    const isCreate = !product;
    const isScannedCreate = isCreate && Boolean(initialBarcode?.trim());
    const isManualCreate = isCreate && !isScannedCreate;
    useEffect(() => {
        if (!open)
            return;
        if (product) {
            setForm({
                name: product.name,
                barcode: product.barcode ?? '',
                categoryId: product.categoryId,
                stock: product.stock,
                stockMin: product.stockMin,
                brand: product.brand ?? '',
                size: product.size ?? '',
                color: product.color ?? '',
                description: product.description ?? '',
                costPrice: product.costPrice,
                priceRetail: product.priceRetail,
                priceWholesale: product.priceWholesale,
                priceDozen: product.priceDozen,
                planchaQty: product.planchaQty,
                pricePlancha: product.pricePlancha,
                cajonQty: product.cajonQty,
                priceCajon: product.priceCajon,
                isActive: product.isActive
            });
        }
        else if (initialBarcode?.trim()) {
            setForm({
                ...defaultForm(),
                barcode: normalizeScannedBarcode(initialBarcode.trim())
            });
        }
        else {
            setForm(defaultForm());
        }
        setPendingImagePath(null);
        setPreviewLocalUrl(null);
        setRemoveImage(false);
        setError(null);
        setFieldErrors({});
    }, [open, product, initialBarcode]);
    useEffect(() => {
        if (!open || !isManualCreate)
            return;
        const category = categories.find((c) => c.id === form.categoryId);
        const preview = deriveBarcodeFromCatalog(category?.name ?? '', form.name);
        setForm((f) => (f.barcode === preview ? f : { ...f, barcode: preview }));
    }, [open, isManualCreate, form.categoryId, form.name, categories]);
    async function handlePickImage() {
        const result = await window.api.products.pickImage();
        if (!result.ok || !result.data)
            return;
        setPendingImagePath(result.data);
        setRemoveImage(false);
        setPreviewLocalUrl(`pos-media://img/${encodeURIComponent(result.data)}`);
    }
    const displayImage = removeImage ? null : previewLocalUrl ?? storedImageUrl;
    function validateForm() {
        const next = {};
        if (!form.name?.trim())
            next.name = 'El nombre es obligatorio';
        if (!form.categoryId)
            next.categoryId = 'La categoría es obligatoria';
        if (isCreate && (form.costPrice == null || form.costPrice <= 0)) {
            next.costPrice = 'El precio de compra es obligatorio';
        }
        else if ((form.costPrice ?? 0) < 0) {
            next.costPrice = 'El precio de compra no puede ser negativo';
        }
        if (form.priceRetail == null || form.priceRetail <= 0) {
            next.priceRetail = 'El precio por menor es obligatorio';
        }
        if (isCreate && (form.priceWholesale == null || form.priceWholesale <= 0)) {
            next.priceWholesale = 'El precio por mayor es obligatorio';
        }
        else if (form.priceWholesale != null && form.priceWholesale < 0) {
            next.priceWholesale = 'El precio por mayor no puede ser negativo';
        }
        if ((form.priceDozen ?? 0) < 0) {
            next.priceDozen = 'El precio por unidad de la docena no puede ser negativo';
        }
        const planchaQty = form.planchaQty ?? 0;
        const pricePlancha = form.pricePlancha ?? 0;
        if (planchaQty < 0)
            next.planchaQty = 'La cantidad no puede ser negativa';
        if (pricePlancha < 0)
            next.pricePlancha = 'El precio no puede ser negativo';
        if (planchaQty > 0 && pricePlancha <= 0) {
            next.pricePlancha = 'Indique el precio por unidad de la plancha';
        }
        if (pricePlancha > 0 && planchaQty <= 0) {
            next.planchaQty = 'Indique las unidades por plancha';
        }
        const cajonQty = form.cajonQty ?? 0;
        const priceCajon = form.priceCajon ?? 0;
        if (cajonQty < 0)
            next.cajonQty = 'La cantidad no puede ser negativa';
        if (priceCajon < 0)
            next.priceCajon = 'El precio no puede ser negativo';
        if (cajonQty > 0 && priceCajon <= 0) {
            next.priceCajon = 'Indique el precio por unidad del cajón';
        }
        if (priceCajon > 0 && cajonQty <= 0) {
            next.cajonQty = 'Indique las unidades por cajón';
        }
        if ((form.stockMin ?? 0) > (form.stock ?? 0)) {
            next.stockMin = 'El stock mínimo no puede ser mayor que el stock actual';
        }
        setFieldErrors(next);
        return Object.keys(next).length === 0;
    }
    async function handleSubmit(e) {
        e.preventDefault();
        if (!validateForm())
            return;
        const normalizedBarcode = form.barcode?.trim()
            ? normalizeScannedBarcode(form.barcode.trim())
            : null;
        if (isScannedCreate && normalizedBarcode) {
            const dup = await window.api.products.lookupBarcode(normalizedBarcode);
            if (dup.ok) {
                setError(`El código ya está registrado en "${dup.data.name}"`);
                return;
            }
        }
        setSaving(true);
        setError(null);
        const payload = {
            ...form,
            productCode: null,
            barcode: normalizedBarcode,
            categoryId: form.categoryId ? Number(form.categoryId) : null,
            brand: form.brand?.trim() || null,
            size: form.size?.trim() || null,
            color: form.color?.trim() || null,
            description: form.description?.trim() || null,
            priceWholesale: form.priceWholesale != null && form.priceWholesale > 0 ? form.priceWholesale : null,
            priceDozen: form.priceDozen != null && form.priceDozen > 0 ? form.priceDozen : null,
            planchaQty: form.planchaQty != null && form.planchaQty > 0 ? form.planchaQty : null,
            pricePlancha: form.pricePlancha != null && form.pricePlancha > 0 ? form.pricePlancha : null,
            cajonQty: form.cajonQty != null && form.cajonQty > 0 ? form.cajonQty : null,
            priceCajon: form.priceCajon != null && form.priceCajon > 0 ? form.priceCajon : null,
            stockMin: form.stockMin ?? 0,
            pendingImagePath,
            removeImage,
            skipAutoBarcode: isScannedCreate
        };
        const result = product
            ? await window.api.products.update(product.id, payload)
            : await window.api.products.create(payload);
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        onSaved();
        onClose();
    }
    const categoryOptions = buildCategorySelectOptions(categories);
    const modalTitle = product
        ? 'Editar producto'
        : isScannedCreate
            ? 'Nuevo producto — código escaneado'
            : 'Nuevo producto';
    return (_jsx(Modal, { open: open, title: modalTitle, onClose: onClose, size: "xl", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", type: "button", onClick: onClose, children: "Cancelar" }), _jsx(Button, { type: "submit", form: "product-form", disabled: saving, children: saving ? 'Guardando...' : 'Guardar' })] }), children: _jsxs("form", { id: "product-form", onSubmit: (e) => void handleSubmit(e), className: "space-y-6", children: [_jsxs(FormSection, { title: "Informaci\u00F3n b\u00E1sica", children: [isScannedCreate && (_jsx("div", { className: "rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm text-[rgb(var(--text-muted))]", children: "C\u00F3digo del empaque detectado. Complete nombre, categor\u00EDa y precios." })), _jsx(Input, { label: "Nombre del producto", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), required: true, error: fieldErrors.name, autoFocus: true }), _jsx(Select, { label: "Categor\u00EDa", value: form.categoryId ? String(form.categoryId) : '', onChange: (v) => setForm({ ...form, categoryId: v ? Number(v) : null }), options: categoryOptions, placeholder: "Seleccione una categor\u00EDa", error: fieldErrors.categoryId, required: true }), _jsxs("div", { children: [_jsx(Input, { label: "C\u00F3digo de barras", value: form.barcode ?? '', readOnly: isCreate, onChange: isCreate
                                        ? undefined
                                        : (e) => setForm({ ...form, barcode: e.target.value }), autoComplete: "off", className: "font-mono", placeholder: isManualCreate ? 'Se genera al completar nombre y categoría' : '' }), isManualCreate && (_jsx("p", { className: "mt-1 text-xs text-[rgb(var(--text-muted))]", children: "Se genera autom\u00E1ticamente con iniciales de categor\u00EDa y producto (ej. RH-CP-3847)" })), isScannedCreate && (_jsx("p", { className: "mt-1 text-xs text-[rgb(var(--text-muted))]", children: "C\u00F3digo del producto escaneado (no editable)" }))] }), product?.productCode && (_jsxs("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: ["C\u00F3digo interno: ", _jsx("span", { className: "font-mono", children: product.productCode })] }))] }), _jsxs(FormSection, { title: "Precios y stock", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2 lg:grid-cols-4", children: [_jsx(MoneyInput, { label: "Precio de compra", value: form.costPrice ?? 0, onChange: (v) => setForm({ ...form, costPrice: v }), required: isCreate, error: fieldErrors.costPrice }), _jsx(MoneyInput, { label: "Precio por menor", value: form.priceRetail, onChange: (v) => setForm({ ...form, priceRetail: v }), required: true, error: fieldErrors.priceRetail }), _jsx(MoneyInput, { label: "Precio por mayor", value: form.priceWholesale ?? 0, onChange: (v) => setForm({ ...form, priceWholesale: v > 0 ? v : null }), required: isCreate, error: fieldErrors.priceWholesale }), _jsxs("div", { children: [isCreate ? (_jsx(NumberInput, { label: "Stock inicial", min: 0, emptyValue: 0, value: form.stock ?? 0, onChange: (v) => setForm({ ...form, stock: v }) })) : (_jsx(Input, { label: "Stock actual", type: "number", value: String(form.stock ?? 0), readOnly: true, className: "cursor-not-allowed opacity-80" })), _jsx("p", { className: "mt-1 text-xs text-[rgb(var(--text-muted))]", children: isCreate
                                                ? 'Después de guardar, el stock solo baja al vender.'
                                                : 'El stock solo baja al vender. Para agregar unidades use Ajustar stock.' })] })] }), _jsx(NumberInput, { label: "Stock m\u00EDnimo (alerta)", min: 0, max: form.stock ?? 0, emptyValue: 0, value: form.stockMin ?? 0, onChange: (v) => setForm({ ...form, stockMin: v }), error: fieldErrors.stockMin }), _jsx("p", { className: "text-sm font-medium", children: "Empaques (opcional)" }), _jsx("p", { className: "text-xs text-[rgb(var(--text-muted))]", children: "El precio es por unidad. Al vender se multiplica por las unidades del empaque." }), _jsx("div", { className: "grid gap-4 md:grid-cols-3", children: _jsxs("div", { children: [_jsx(MoneyInput, { label: "Precio por unidad (docena)", value: form.priceDozen ?? 0, onChange: (v) => setForm({ ...form, priceDozen: v > 0 ? v : null }), error: fieldErrors.priceDozen }), _jsx(PackTotalHint, { units: DOZEN_UNITS, unitPrice: form.priceDozen, emptyText: "12 unidades. D\u00E9jelo en 0 si no aplica." })] }) }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { children: [_jsx(NumberInput, { label: "Plancha (cantidad)", min: 0, emptyValue: 0, value: form.planchaQty ?? 0, onChange: (v) => setForm({ ...form, planchaQty: v > 0 ? v : null }), error: fieldErrors.planchaQty }), _jsx("p", { className: "mt-1 text-xs text-[rgb(var(--text-muted))]", children: "Unidades que contiene una plancha. 0 si no aplica." })] }), _jsxs("div", { children: [_jsx(MoneyInput, { label: "Precio por unidad (plancha)", value: form.pricePlancha ?? 0, onChange: (v) => setForm({ ...form, pricePlancha: v > 0 ? v : null }), error: fieldErrors.pricePlancha }), _jsx(PackTotalHint, { units: form.planchaQty, unitPrice: form.pricePlancha, emptyText: "Se cobra \u00D7 la cantidad de la plancha." })] }), _jsxs("div", { children: [_jsx(NumberInput, { label: "Caj\u00F3n (cantidad)", min: 0, emptyValue: 0, value: form.cajonQty ?? 0, onChange: (v) => setForm({ ...form, cajonQty: v > 0 ? v : null }), error: fieldErrors.cajonQty }), _jsx("p", { className: "mt-1 text-xs text-[rgb(var(--text-muted))]", children: "Unidades que contiene un caj\u00F3n. 0 si no aplica." })] }), _jsxs("div", { children: [_jsx(MoneyInput, { label: "Precio por unidad (caj\u00F3n)", value: form.priceCajon ?? 0, onChange: (v) => setForm({ ...form, priceCajon: v > 0 ? v : null }), error: fieldErrors.priceCajon }), _jsx(PackTotalHint, { units: form.cajonQty, unitPrice: form.priceCajon, emptyText: "Se cobra \u00D7 la cantidad del caj\u00F3n." })] })] })] }), _jsxs(FormSection, { title: "Detalles opcionales", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsx(Input, { label: "Marca", value: form.brand ?? '', onChange: (e) => setForm({ ...form, brand: e.target.value }) }), _jsx(Input, { label: "Color", value: form.color ?? '', onChange: (e) => setForm({ ...form, color: e.target.value }) }), _jsx(Input, { label: "Modelo / Tama\u00F1o", value: form.size ?? '', onChange: (e) => setForm({ ...form, size: e.target.value }) })] }), _jsxs("label", { className: "flex flex-col gap-2", children: [_jsx("span", { className: "text-sm font-medium", children: "Descripci\u00F3n" }), _jsx("textarea", { value: form.description ?? '', onChange: (e) => setForm({ ...form, description: e.target.value }), rows: 3, className: "rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" })] }), _jsxs("div", { children: [_jsx("p", { className: "mb-2 text-sm font-medium", children: "Imagen del producto" }), _jsx("div", { className: "flex h-36 items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface/50", children: displayImage ? (_jsx("img", { src: displayImage, alt: "", className: "max-h-full max-w-full object-contain" })) : (_jsx("span", { className: "text-xs text-[rgb(var(--text-muted))]", children: "Sin imagen" })) }), _jsxs("div", { className: "mt-2 flex flex-wrap gap-2", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => void handlePickImage(), children: "Elegir imagen" }), (displayImage || product?.imagePath) && (_jsx(Button, { type: "button", variant: "ghost", onClick: () => {
                                                setRemoveImage(true);
                                                setPendingImagePath(null);
                                                setPreviewLocalUrl(null);
                                            }, children: "Quitar" }))] })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: form.isActive !== false, onChange: (e) => setForm({ ...form, isActive: e.target.checked }) }), "Activo"] })] }), error && _jsx("p", { className: "text-sm text-red-500", children: error })] }) }));
}
