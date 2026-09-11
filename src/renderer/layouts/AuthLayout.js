import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
export function AuthLayout() {
    const session = useAuthStore((s) => s.session);
    const loading = useAuthStore((s) => s.loading);
    if (loading) {
        return (_jsx("div", { className: "flex h-full min-h-screen items-center justify-center", children: "Cargando..." }));
    }
    if (session)
        return _jsx(Navigate, { to: "/dashboard", replace: true });
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-surface p-6", children: _jsx(Outlet, {}) }));
}
