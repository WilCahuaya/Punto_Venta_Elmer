import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { LoginPage } from '../pages/Login/LoginPage'
import { DashboardPage } from '../pages/Dashboard/DashboardPage'
import { CategoriesPage } from '../pages/Categories/CategoriesPage'
import { ProductsPage } from '../pages/Products/ProductsPage'
import { CashPage } from '../pages/Cash/CashPage'
import { PosPage } from '../pages/Pos/PosPage'
import { SettingsPage } from '../pages/Settings/SettingsPage'
import { LabelsPage } from '../pages/Labels/LabelsPage'
import { PlaceholderPage } from '../pages/Placeholder/PlaceholderPage'
import { useAuthStore } from '../stores/auth.store'

function ProtectedRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const session = useAuthStore((s) => s.session)
  const loading = useAuthStore((s) => s.loading)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[rgb(var(--text-muted))]">
        Cargando...
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pos" element={<PosPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/labels" element={<LabelsPage />} />
        <Route path="/cash" element={<CashPage />} />
        <Route path="/reports" element={<PlaceholderPage title="Reportes" phase="Fase 7" />} />
        <Route path="/backups" element={<PlaceholderPage title="Backups" phase="Fase 8" />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
