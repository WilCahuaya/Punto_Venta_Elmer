import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useAuthStore } from '../stores/auth.store'
import { useCashStore } from '../stores/cash.store'
import { useSettingsStore } from '../stores/settings.store'

interface NavItem {
  to: string
  label: string
}

interface NavSection {
  id?: string
  label?: string
  collapsible?: boolean
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    items: [
      { to: '/dashboard', label: 'Inicio' },
      { to: '/pos', label: 'POS' }
    ]
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    collapsible: true,
    items: [{ to: '/cash', label: 'Caja' }]
  },
  {
    id: 'catalogo',
    label: 'Catálogo',
    collapsible: true,
    items: [
      { to: '/products', label: 'Productos' },
      { to: '/categories', label: 'Categorías' },
      { to: '/labels', label: 'Etiquetas' }
    ]
  },
  {
    items: [
      { to: '/backups', label: 'Backups' },
      { to: '/settings', label: 'Configuración' }
    ]
  }
]

function isRouteActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`)
}

function sectionHasActiveItem(pathname: string, items: NavItem[]): boolean {
  return items.some((item) => isRouteActive(pathname, item.to))
}

function readExpanded(id: string, defaultOpen: boolean): boolean {
  try {
    const stored = localStorage.getItem(`nav-expanded-${id}`)
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch {
    // ignore
  }
  return defaultOpen
}

function NavItems({ items }: { items: NavItem[] }): React.JSX.Element {
  return (
    <div className="space-y-0.5">
      {items.map((item) => (
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
    </div>
  )
}

function CollapsibleNavSection({
  section,
  defaultOpen
}: {
  section: NavSection
  defaultOpen: boolean
}): React.JSX.Element {
  const id = section.id!
  const [expanded, setExpanded] = useState(() => readExpanded(id, defaultOpen))

  useEffect(() => {
    if (defaultOpen) setExpanded(true)
  }, [defaultOpen])

  function toggle(): void {
    setExpanded((prev) => {
      const next = !prev
      try {
        localStorage.setItem(`nav-expanded-${id}`, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className="mb-1 flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] transition-colors hover:bg-surface-border/30 hover:text-[rgb(var(--text))]"
      >
        <span>{section.label}</span>
        <svg
          className={[
            'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
            expanded ? 'rotate-180' : ''
          ].join(' ')}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {expanded && (
        <div className="space-y-0.5 pl-1">
          <NavItems items={section.items} />
        </div>
      )}
    </div>
  )
}

export function AppLayout(): React.JSX.Element {
  const location = useLocation()
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

        <nav className="flex-1 overflow-y-auto p-2">
          {navSections.map((section, si) => {
            const activeInSection = sectionHasActiveItem(location.pathname, section.items)

            return (
              <div key={section.id ?? `section-${si}`} className={si > 0 ? 'mt-4' : ''}>
                {section.collapsible && section.label && section.id ? (
                  <CollapsibleNavSection section={section} defaultOpen={activeInSection} />
                ) : section.label ? (
                  <>
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
                      {section.label}
                    </p>
                    <NavItems items={section.items} />
                  </>
                ) : (
                  <NavItems items={section.items} />
                )}
              </div>
            )
          })}
        </nav>

        <div className="space-y-2 border-t border-surface-border p-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void save({ theme: theme === 'light' ? 'dark' : 'light' })}
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
