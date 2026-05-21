import { useEffect, useState } from 'react'
import { CURRENCY_DECIMALS, parseMoneyInput, roundMoney } from '@shared/lib/currency'

interface MoneyInputProps {
  label?: string
  value: number
  onChange: (value: number) => void
  error?: string
  required?: boolean
}

export function MoneyInput({
  label,
  value,
  onChange,
  error,
  required
}: MoneyInputProps): React.JSX.Element {
  const [text, setText] = useState(value.toFixed(CURRENCY_DECIMALS))

  useEffect(() => {
    setText(value.toFixed(CURRENCY_DECIMALS))
  }, [value])

  function handleBlur(): void {
    const parsed = parseMoneyInput(text)
    const next = parsed ?? 0
    onChange(roundMoney(next))
    setText(next.toFixed(CURRENCY_DECIMALS))
  }

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && (
        <span className="font-medium">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        className={[
          'rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5 tabular-nums',
          'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
          error ? 'border-red-500' : ''
        ].join(' ')}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  )
}
