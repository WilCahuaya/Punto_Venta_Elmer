import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, useLocation } from 'react-router-dom';
/** Redirige a Caja → Tickets (Ventas integrado en Caja, opción A). */
export function SalesPage() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    params.set('tab', 'tickets');
    return _jsx(Navigate, { to: `/cash?${params.toString()}`, replace: true });
}
