import type { CashSessionSummary } from '@shared/types/cash'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'

interface CashExpectedBreakdownProps {
  session: CashSessionSummary
  compact?: boolean
}

export function CashExpectedBreakdown({
  session,
  compact = false
}: CashExpectedBreakdownProps): React.JSX.Element {
  return (
    <div
      className={[
        'rounded-xl border border-surface-border bg-surface-elevated',
        compact ? 'p-4' : 'p-5'
      ].join(' ')}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h4 className="font-medium">Efectivo esperado en caja</h4>
          <p className="text-xs text-[rgb(var(--text-muted))]">
            Cuánto debería haber al contar billetes y monedas en el turno
          </p>
        </div>
        <MoneyDisplay amount={session.expectedInDrawer} size="lg" className="font-semibold" />
      </div>

      <ul className="space-y-2 text-sm">
        <BreakdownLine label="Apertura" amount={session.openingAmount} kind="add" />
        <BreakdownLine label="Ventas en efectivo" amount={session.totalSalesGross} kind="add" />
        {session.totalReturns > 0 && (
          <BreakdownLine
            label="Devoluciones (efectivo devuelto al cliente)"
            amount={session.totalReturns}
            kind="subtract"
          />
        )}
        {session.creditCashCollected !== 0 && (
          <BreakdownLine
            label="Abonos de fiados (efectivo)"
            amount={Math.abs(session.creditCashCollected)}
            kind={session.creditCashCollected < 0 ? 'subtract' : 'add'}
          />
        )}
        {session.totalIncome > 0 && (
          <BreakdownLine label="Ingresos manuales" amount={session.totalIncome} kind="add" />
        )}
        {session.totalExpense > 0 && (
          <BreakdownLine label="Egresos manuales" amount={session.totalExpense} kind="subtract" />
        )}
        <li className="flex items-center justify-between border-t border-surface-border pt-3 font-medium">
          <span>= Esperado en caja</span>
          <MoneyDisplay amount={session.expectedInDrawer} size="sm" />
        </li>
      </ul>

      {(session.totalYapeGross > 0 || session.totalYape > 0 || session.creditYapeCollected !== 0) && (
        <div className="mt-4 rounded-lg border border-fuchsia-500/25 bg-fuchsia-500/5 px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span>Ventas Yape (no entran al cajón)</span>
            <MoneyDisplay amount={session.totalYape} size="sm" />
          </div>
          {session.creditYapeCollected !== 0 && (
            <div className="mt-1 flex items-center justify-between gap-3 text-xs">
              <span>Abonos fiado por Yape</span>
              <MoneyDisplay amount={session.creditYapeCollected} size="sm" />
            </div>
          )}
          {session.totalYapeReturns > 0 && (
            <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
              Devoluciones Yape:{' '}
              <MoneyDisplay amount={session.totalYapeReturns} size="sm" className="inline" />
            </p>
          )}
        </div>
      )}

      {session.totalReturns > 0 && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          Las devoluciones en efectivo restan del cajón porque el dinero sale de la caja al cliente.
        </p>
      )}
    </div>
  )
}

function BreakdownLine({
  label,
  amount,
  kind
}: {
  label: string
  amount: number
  kind: 'add' | 'subtract'
}): React.JSX.Element {
  const sign = kind === 'add' ? '+' : '−'
  const color = kind === 'subtract' ? 'text-amber-600' : 'text-[rgb(var(--text-muted))]'

  return (
    <li className="flex items-start justify-between gap-3">
      <span className={color}>
        {sign} {label}
      </span>
      <MoneyDisplay amount={amount} size="sm" className={kind === 'subtract' ? 'text-amber-600' : ''} />
    </li>
  )
}
