import { jsx as _jsx } from "react/jsx-runtime";
const variants = {
    default: 'bg-brand/10 text-brand',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    muted: 'bg-surface-border/50 text-[rgb(var(--text-muted))]'
};
export function Badge({ children, variant = 'default' }) {
    return (_jsx("span", { className: [
            'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
            variants[variant]
        ].join(' '), children: children }));
}
