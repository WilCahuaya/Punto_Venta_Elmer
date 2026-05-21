import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/auth.store'

export function AuthLayout(): React.JSX.Element {
  const session = useAuthStore((s) => s.session)
  const loading = useAuthStore((s) => s.loading)

  if (loading) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center">Cargando...</div>
    )
  }

  if (session) return <Navigate to="/dashboard" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <Outlet />
    </div>
  )
}
