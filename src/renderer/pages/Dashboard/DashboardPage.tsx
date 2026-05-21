import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CashSessionSummary } from '@shared/types/cash'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { useCashStore } from '../../stores/cash.store'

export function DashboardPage(): React.JSX.Element {
  const current = useCashStore((s) => s.current)
  const isOpen = useCashStore((s) => s.isOpen)
  const refresh = useCashStore((s) => s.refresh)
  const [lowStockCount, setLowStockCount] = useState(0)

  useEffect(() => {
    void refresh()
    async function loadProducts(): Promise<void> {
      const res = await window.api.products.list({ lowStockOnly: true })
      if (res.ok) setLowStockCount(res.data.length)
    }
    void loadProducts()
  }, [refresh])

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-sm text-[rgb(var(--text-muted))]">Resumen del turno actual</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Estado de caja">
          <div className="flex items-center gap-2">
            <Badge variant={isOpen ? 'success' : 'muted'}>
              {isOpen ? 'Abierta' : 'Cerrada'}
            </Badge>
            {!isOpen && (
              <Link to="/cash">
                <Button variant="ghost">Abrir</Button>
              </Link>
            )}
          </div>
        </StatCard>

        <StatCard title="En caja (esperado)">
          <MoneyDisplay amount={current?.expectedInDrawer ?? 0} size="lg" />
        </StatCard>

        <StatCard title="Ventas del turno">
          <MoneyDisplay amount={current?.totalSales ?? 0} size="lg" />
        </StatCard>

        <StatCard title="Ganancia ventas">
          <MoneyDisplay amount={current?.salesProfit ?? 0} size="lg" />
        </StatCard>

        <StatCard title="Ingresos manuales">
          <MoneyDisplay amount={current?.totalIncome ?? 0} size="lg" />
        </StatCard>

        <StatCard title="Egresos">
          <MoneyDisplay amount={current?.totalExpense ?? 0} size="lg" />
        </StatCard>

        <StatCard title="Productos stock bajo">
          <span className="text-2xl font-semibold tabular-nums">{lowStockCount}</span>
        </StatCard>

        <StatCard title="Apertura">
          <MoneyDisplay amount={current?.openingAmount ?? 0} size="lg" />
        </StatCard>
      </div>

      {isOpen && current && (
        <CashTurnSummary summary={current} />
      )}
    </div>
  )
}

function StatCard({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-elevated p-4">
      <p className="text-sm text-[rgb(var(--text-muted))]">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function CashTurnSummary({ summary }: { summary: CashSessionSummary }): React.JSX.Element {
  return (
    <p className="mt-6 text-sm text-[rgb(var(--text-muted))]">
      Turno #{summary.id} abierto — ingresos{' '}
      <MoneyDisplay amount={summary.totalIncome} size="sm" className="inline" /> · egresos{' '}
      <MoneyDisplay amount={summary.totalExpense} size="sm" className="inline" />
    </p>
  )
}
