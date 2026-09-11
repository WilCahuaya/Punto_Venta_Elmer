import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Button } from './Button';
const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
};
export function Modal({ open, title, onClose, children, footer, size = 'lg' }) {
    useEffect(() => {
        if (!open)
            return;
        function onKey(e) {
            if (e.key === 'Escape')
                onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [_jsx("button", { type: "button", className: "absolute inset-0 bg-black/50", "aria-label": "Cerrar", onClick: onClose }), _jsxs("div", { role: "dialog", className: [
                    'relative z-10 flex max-h-[90vh] w-full flex-col rounded-2xl border border-surface-border bg-surface-elevated shadow-xl',
                    sizes[size]
                ].join(' '), children: [_jsxs("div", { className: "flex items-center justify-between border-b border-surface-border px-5 py-4", children: [_jsx("h3", { className: "text-lg font-semibold", children: title }), _jsx(Button, { variant: "ghost", type: "button", onClick: onClose, "aria-label": "Cerrar", children: "\u2715" })] }), _jsx("div", { className: "overflow-y-auto px-5 py-4", children: children }), footer && (_jsx("div", { className: "flex justify-end gap-2 border-t border-surface-border px-5 py-4", children: footer }))] })] }));
}
