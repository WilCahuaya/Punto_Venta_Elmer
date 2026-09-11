import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
export const Input = forwardRef(function Input({ label, error, className = '', id, required, ...props }, ref) {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-');
    return (_jsxs("label", { className: "flex flex-col gap-1.5 text-sm", children: [label && (_jsxs("span", { className: "font-medium text-[rgb(var(--text))]", children: [label, required && _jsx("span", { className: "text-red-500", children: " *" })] })), _jsx("input", { ref: ref, id: inputId, required: required, className: [
                    'rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5',
                    'text-[rgb(var(--text))] placeholder:text-[rgb(var(--text-muted))]',
                    'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
                    error ? 'border-red-500' : '',
                    className
                ]
                    .filter(Boolean)
                    .join(' '), ...props }), error && _jsx("span", { className: "text-xs text-red-500", children: error })] }));
});
