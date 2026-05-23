import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { DashboardStats } from '@shared/types/dashboard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { formatDateTime } from '../../lib/datetime'
import { useCashStore } from '../../stores/cash.store'

export function DashboardPage(): React.JSX.Element {
  const refreshCash = useCashStore((s) => s.refresh)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    await refreshCash()
    const result = await window.api.dashboard.getStats()
    if (result.ok) setStats(result.data)
    setLoading(false)
  }, [refreshCash])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !stats) {
    return (
      <div className="flex h-64 items-center justify-center text-[rgb(var(--text-muted))]">
        Cargando...
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center text-[rgb(var(--text-muted))]">
        No se pudo cargar el resumen.
        <Button className="mt-4" onClick={() => void load()}>
          Reintentar
        </Button>
      </div>
    )
  }

  const session = stats.currentSession

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Inicio</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            {formatDisplayDate(stats.date)}
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load()}>
          Actualizar
        </Button>
      </header>

      {/* Caja — lo más urgente para el cajero */}
      <section className="rounded-xl border border-brand/20 bg-brand/5 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">Caja</h3>
          <Badge variant={stats.cashOpen ? 'success' : 'warning'}>
            {stats.cashOpen ? 'Abierta' : 'Cerrada'}
          </Badge>
        </div>

        {stats.cashOpen && session ? (
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm text-[rgb(var(--text-muted))]">Efectivo esperado ahora</p>
              <MoneyDisplay amount={session.expectedInDrawer} size="lg" className="mt-1 font-semibold" />
              <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">
                Turno #{session.id} · Abierto {formatDateTime(session.openedAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/cash">
                <Button>Ir a Caja</Button>
              </Link>
              <Link to="/cash?tab=tickets">
                <Button variant="secondary" type="button">
                  Tickets del turno
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-[rgb(var(--text-muted))]">
              Abra la caja para vender desde el POS.
            </p>
            <Link to="/cash">
              <Button>Abrir caja</Button>
            </Link>
          </div>
        )}
      </section>

      {/* Negocio hoy */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-[rgb(var(--text-muted))]">Negocio hoy</h3>
          <Link to="/reports" className="text-xs text-brand hover:underline">
            Detalle en Reportes → Hoy
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Ingresos netos" highlight>
            <MoneyDisplay amount={stats.dailySalesTotal} size="lg" />
            <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
              {stats.dailySalesCount} venta(s)
            </p>
          </StatCard>
          <StatCard title="Devoluciones">
            <MoneyDisplay
              amount={stats.dailyReturnsTotal}
              size="lg"
              className={stats.dailyReturnsTotal > 0 ? 'text-amber-600' : ''}
            />
          </StatCard>
          <StatCard title="Ganancia">
            <MoneyDisplay amount={stats.dailySalesProfit} size="lg" className="text-emerald-600" />
          </StatCard>
          <StatCard title="Stock bajo">
            <span className="text-2xl font-semibold tabular-nums text-amber-600">
              {stats.lowStockProducts.length}
            </span>
            <Link to="/products" className="mt-2 block text-xs text-brand hover:underline">
              Ver productos
            </Link>
          </StatCard>
        </div>
      </section>

      {stats.topProductsToday.length > 0 && (
        <section className="rounded-xl border border-surface-border bg-surface-elevated">
          <div className="border-b border-surface-border px-4 py-3">
            <h3 className="text-sm font-medium">Top productos hoy</h3>
          </div>
          <ul className="divide-y divide-surface-border/60">
            {stats.topProductsToday.slice(0, 5).map((p, i) => (
              <li
                key={p.productId}
                className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm"
              >
                <span>
                  <span className="mr-2 text-[rgb(var(--text-muted))]">#{i + 1}</span>
                  {p.productName}
                </span>
                <MoneyDisplay amount={p.revenue} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats.lowStockProducts.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5">
          <div className="border-b border-amber-500/20 px-4 py-3">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Stock bajo ({stats.lowStockProducts.length})
            </h3>
          </div>
          <ul className="max-h-48 divide-y divide-amber-500/10 overflow-y-auto">
            {stats.lowStockProducts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
              >
                <span>{p.name}</span>
                <Badge variant="warning">
                  {p.stock} / {p.stockMin}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function StatCard({
  title,
  children,
  highlight
}: {
  title: string
  children: React.ReactNode
  highlight?: boolean
}): React.JSX.Element {
  return (
    <div
      className={[
        'rounded-xl border border-surface-border bg-surface-elevated p-4',
        highlight ? 'ring-2 ring-brand/20' : ''
      ].join(' ')}
    >
      <p className="text-sm text-[rgb(var(--text-muted))]">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
}
