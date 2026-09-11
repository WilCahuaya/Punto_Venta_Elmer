import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { LoginPage } from '../pages/Login/LoginPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { CategoriesPage } from '../pages/Categories/CategoriesPage';
import { ProductsPage } from '../pages/Products/ProductsPage';
import { CashPage } from '../pages/Cash/CashPage';
import { PosPage } from '../pages/Pos/PosPage';
import { SettingsPage } from '../pages/Settings/SettingsPage';
import { LabelsPage } from '../pages/Labels/LabelsPage';
import { ReportsPage } from '../pages/Reports/ReportsPage';
import { SalesPage } from '../pages/Sales/SalesPage';
import { BackupsPage } from '../pages/Backups/BackupsPage';
import { CreditsPage } from '../pages/Credits/CreditsPage';
import { useAuthStore } from '../stores/auth.store';
function ProtectedRoute({ children }) {
    const session = useAuthStore((s) => s.session);
    const loading = useAuthStore((s) => s.loading);
    if (loading) {
        return (_jsx("div", { className: "flex h-full items-center justify-center text-[rgb(var(--text-muted))]", children: "Cargando..." }));
    }
    if (!session)
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(_Fragment, { children: children });
}
export function AppRoutes() {
    return (_jsxs(Routes, { children: [_jsx(Route, { element: _jsx(AuthLayout, {}), children: _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }) }), _jsxs(Route, { element: _jsx(ProtectedRoute, { children: _jsx(AppLayout, {}) }), children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/dashboard", replace: true }) }), _jsx(Route, { path: "/dashboard", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/pos", element: _jsx(PosPage, {}) }), _jsx(Route, { path: "/products", element: _jsx(ProductsPage, {}) }), _jsx(Route, { path: "/categories", element: _jsx(CategoriesPage, {}) }), _jsx(Route, { path: "/labels", element: _jsx(LabelsPage, {}) }), _jsx(Route, { path: "/cash", element: _jsx(CashPage, {}) }), _jsx(Route, { path: "/credits", element: _jsx(CreditsPage, {}) }), _jsx(Route, { path: "/sales", element: _jsx(SalesPage, {}) }), _jsx(Route, { path: "/reports", element: _jsx(ReportsPage, {}) }), _jsx(Route, { path: "/backups", element: _jsx(BackupsPage, {}) }), _jsx(Route, { path: "/settings", element: _jsx(SettingsPage, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
