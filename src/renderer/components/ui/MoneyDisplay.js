import { jsx as _jsx } from "react/jsx-runtime";
import { formatMoney } from '@shared/lib/currency';
import { useSettingsStore } from '../../stores/settings.store';
const sizes = {
    sm: 'text-sm',
    md: 'text-base font-medium',
    lg: 'text-2xl font-semibold tabular-nums'
};
/** Muestra montos siempre con 2 decimales. */
export function MoneyDisplay({ amount, className = '', size = 'md' }) {
    const symbol = useSettingsStore((s) => s.currencySymbol);
    return (_jsx("span", { className: [sizes[size], 'tabular-nums', className].join(' '), children: formatMoney(amount, symbol) }));
}
