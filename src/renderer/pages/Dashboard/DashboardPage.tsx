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
        Cargando dashboard...
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
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-sm text-[rgb(var(--text-muted))]">
            Resumen del día {formatDisplayDate(stats.date)}
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load()}>
          Actualizar
        </Button>
      </header>

      {/* KPIs del día */}
      <h3 className="mb-3 text-sm font-medium text-[rgb(var(--text-muted))]">Hoy</h3>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Ventas del día" highlight>
          <MoneyDisplay amount={stats.dailySalesTotal} size="lg" />
          <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
            {stats.dailySalesCount} ticket(s)
          </p>
        </StatCard>

        <StatCard title="Ganancias del día">
          <MoneyDisplay amount={stats.dailySalesProfit} size="lg" className="text-emerald-600" />
        </StatCard>

        <StatCard title="Estado de caja">
          <Badge variant={stats.cashOpen ? 'success' : 'warning'}>
            {stats.cashOpen ? 'Abierta' : 'Cerrada'}
          </Badge>
          {!stats.cashOpen && (
            <Link to="/cash" className="mt-2 inline-block">
              <Button variant="ghost">Abrir caja</Button>
            </Link>
          )}
        </StatCard>

        <StatCard title="Stock bajo">
          <span className="text-2xl font-semibold tabular-nums text-amber-600">
            {stats.lowStockProducts.length}
          </span>
          <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">producto(s)</p>
        </StatCard>
      </div>

      {/* Turno actual */}
      {stats.cashOpen && session && (
        <>
          <h3 className="mb-3 text-sm font-medium text-[rgb(var(--text-muted))]">
            Turno actual #{session.id}
          </h3>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Ventas del turno">
              <MoneyDisplay amount={session.totalSales} size="lg" />
            </StatCard>
            <StatCard title="Ganancia del turno">
              <MoneyDisplay amount={session.salesProfit} size="lg" />
            </StatCard>
            <StatCard title="En caja (esperado)">
              <MoneyDisplay amount={session.expectedInDrawer} size="lg" />
            </StatCard>
            <StatCard title="Apertura">
              <MoneyDisplay amount={session.openingAmount} size="lg" />
            </StatCard>
          </div>
          <p className="mb-8 text-xs text-[rgb(var(--text-muted))]">
            Abierto {formatDateTime(session.openedAt)}
            {session.openedByName && ` · ${session.openedByName}`}
          </p>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top productos */}
        <section className="rounded-xl border border-surface-border bg-surface-elevated">
          <div className="border-b border-surface-border px-4 py-3">
            <h3 className="font-medium">Productos más vendidos hoy</h3>
          </div>
          {stats.topProductsToday.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[rgb(var(--text-muted))]">
              Sin ventas registradas hoy
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-[rgb(var(--text-muted))]">
                  <th className="px-4 py-2 font-medium">Producto</th>
                  <th className="px-4 py-2 font-medium text-right">Cant.</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.topProductsToday.map((p, i) => (
                  <tr key={p.productId} className="border-b border-surface-border/50">
                    <td className="px-4 py-2.5">
                      <span className="mr-2 text-xs text-[rgb(var(--text-muted))]">
                        #{i + 1}
                      </span>
                      {p.productName}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{p.quantitySold}</td>
                    <td className="px-4 py-2.5 text-right">
                      <MoneyDisplay amount={p.revenue} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Stock bajo */}
        <section className="rounded-xl border border-surface-border bg-surface-elevated">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <h3 className="font-medium">Alertas de stock bajo</h3>
            <Link to="/products">
              <Button variant="ghost">Ver productos</Button>
            </Link>
          </div>
          {stats.lowStockProducts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[rgb(var(--text-muted))]">
              Todo el stock está por encima del mínimo
            </p>
          ) : (
            <ul className="divide-y divide-surface-border/60">
              {stats.lowStockProducts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm"
                >
                  <div>
                    <span className="font-medium">{p.name}</span>
                    {p.categoryName && (
                      <span className="ml-2 text-xs text-[rgb(var(--text-muted))]">
                        {p.categoryName}
                      </span>
                    )}
                  </div>
                  <Badge variant="warning">
                    {p.stock} / {p.stockMin}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
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
