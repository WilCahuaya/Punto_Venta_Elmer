import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { CURRENCY_DECIMALS, parseMoneyInput, roundMoney } from '@shared/lib/currency';
export function MoneyInput({ label, value, onChange, error, required }) {
    const [text, setText] = useState(value.toFixed(CURRENCY_DECIMALS));
    useEffect(() => {
        setText(value.toFixed(CURRENCY_DECIMALS));
    }, [value]);
    function handleBlur() {
        const parsed = parseMoneyInput(text);
        const next = parsed ?? 0;
        onChange(roundMoney(next));
        setText(next.toFixed(CURRENCY_DECIMALS));
    }
    return (_jsxs("label", { className: "flex flex-col gap-1.5 text-sm", children: [label && (_jsxs("span", { className: "font-medium", children: [label, required && _jsx("span", { className: "text-red-500", children: " *" })] })), _jsx("input", { type: "text", inputMode: "decimal", value: text, onChange: (e) => setText(e.target.value), onBlur: handleBlur, className: [
                    'rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5 tabular-nums',
                    'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
                    error ? 'border-red-500' : ''
                ].join(' ') }), error && _jsx("span", { className: "text-xs text-red-500", children: error })] }));
}
