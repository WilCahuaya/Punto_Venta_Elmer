import { useEffect, useState } from 'react'

interface NumberInputProps {
  label?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number | string
  /** Valor al salir del campo si quedó vacío. */
  emptyValue?: number
  error?: string
  required?: boolean
  className?: string
  id?: string
}

function clamp(n: number, min?: number, max?: number): number {
  let next = n
  if (min != null && Number.isFinite(min)) next = Math.max(min, next)
  if (max != null && Number.isFinite(max)) next = Math.min(max, next)
  return next
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  emptyValue,
  error,
  required,
  className = '',
  id
}: NumberInputProps): React.JSX.Element {
  const [text, setText] = useState(String(value))
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')

  useEffect(() => {
    setText(String(value))
  }, [value])

  function commit(): void {
    const trimmed = text.trim()
    if (trimmed === '' || trimmed === '-' || trimmed === '.') {
      const fallback = emptyValue ?? min ?? 0
      onChange(fallback)
      setText(String(fallback))
      return
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      setText(String(value))
      return
    }
    const next = clamp(parsed, min, max)
    onChange(next)
    setText(String(next))
  }

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && (
        <span className="font-medium text-[rgb(var(--text))]">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
      )}
      <input
        id={inputId}
        type="text"
        inputMode="decimal"
        value={text}
        required={required}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur()
          }
        }}
        className={[
          'rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5 tabular-nums',
          'text-[rgb(var(--text))] placeholder:text-[rgb(var(--text-muted))]',
          'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
          error ? 'border-red-500' : '',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        data-step={step}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  )
}
