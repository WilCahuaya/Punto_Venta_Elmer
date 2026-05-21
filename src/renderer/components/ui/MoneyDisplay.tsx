import { formatMoney } from '@shared/lib/currency'
import { useSettingsStore } from '../../stores/settings.store'

interface MoneyDisplayProps {
  amount: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'text-sm',
  md: 'text-base font-medium',
  lg: 'text-2xl font-semibold tabular-nums'
}

/** Muestra montos siempre con 2 decimales. */
export function MoneyDisplay({
  amount,
  className = '',
  size = 'md'
}: MoneyDisplayProps): React.JSX.Element {
  const symbol = useSettingsStore((s) => s.currencySymbol)
  return (
    <span className={[sizes[size], 'tabular-nums', className].join(' ')}>
      {formatMoney(amount, symbol)}
    </span>
  )
}
