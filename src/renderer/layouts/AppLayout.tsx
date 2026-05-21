import { NavLink, Outlet } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAuthStore } from '../stores/auth.store'
import { useCashStore } from '../stores/cash.store'
import { useSettingsStore } from '../stores/settings.store'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/pos', label: 'POS' },
  { to: '/products', label: 'Productos' },
  { to: '/categories', label: 'Categorías' },
  { to: '/labels', label: 'Etiquetas' },
  { to: '/cash', label: 'Caja' },
  { to: '/reports', label: 'Reportes' },
  { to: '/backups', label: 'Backups' },
  { to: '/settings', label: 'Configuración' }
]

export function AppLayout(): React.JSX.Element {
  const session = useAuthStore((s) => s.session)
  const logout = useAuthStore((s) => s.logout)
  const theme = useSettingsStore((s) => s.theme)
  const save = useSettingsStore((s) => s.save)
  const cashOpen = useCashStore((s) => s.isOpen)

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col border-r border-surface-border bg-surface-elevated">
        <div className="border-b border-surface-border px-4 py-5">
          <h1 className="text-lg font-semibold tracking-tight">Punto de Venta</h1>
          <p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">
            {session?.displayName ?? session?.username}
          </p>
          <div className="mt-2">
            <Badge variant={cashOpen ? 'success' : 'warning'}>
              Caja {cashOpen ? 'abierta' : 'cerrada'}
            </Badge>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'block rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-brand/10 font-medium text-brand'
                    : 'text-[rgb(var(--text-muted))] hover:bg-surface-border/30 hover:text-[rgb(var(--text))]'
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-surface-border p-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() =>
              void save({ theme: theme === 'light' ? 'dark' : 'light' })
            }
          >
            Tema {theme === 'light' ? 'oscuro' : 'claro'}
          </Button>
          <Button variant="ghost" fullWidth onClick={() => void logout()}>
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-surface p-6">
        <Outlet />
      </main>
    </div>
  )
}
