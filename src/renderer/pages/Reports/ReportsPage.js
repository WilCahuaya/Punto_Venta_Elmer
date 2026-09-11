import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
/** Reportes fusionado en Inicio. */
export function ReportsPage() {
    return _jsx(Navigate, { to: "/dashboard", replace: true });
}
