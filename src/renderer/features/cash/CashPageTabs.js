export const CASH_TABS = [
    { id: 'turno', label: 'Turno' },
    { id: 'tickets', label: 'Tickets' },
    { id: 'cierres', label: 'Cierres' }
];
export function parseCashTab(value) {
    if (value === 'tickets' || value === 'cierres')
        return value;
    return 'turno';
}
