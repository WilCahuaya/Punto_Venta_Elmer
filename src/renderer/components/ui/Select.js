import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Select({ label, value, onChange, options, placeholder, error, required }) {
    return (_jsxs("label", { className: "flex flex-col gap-1.5 text-sm", children: [label && (_jsxs("span", { className: "font-medium", children: [label, required && _jsx("span", { className: "text-red-500", children: " *" })] })), _jsxs("select", { value: value, onChange: (e) => onChange(e.target.value), required: required, className: [
                    'rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5',
                    'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
                    error ? 'border-red-500' : ''
                ].join(' '), children: [placeholder && (_jsx("option", { value: "", children: placeholder })), options.map((opt) => (_jsx("option", { value: opt.value, children: opt.label }, opt.value)))] }), error && _jsx("span", { className: "text-xs text-red-500", children: error })] }));
}
