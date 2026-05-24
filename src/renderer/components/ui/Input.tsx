import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = '', id, required, ...props },
  ref
): React.JSX.Element {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && (
        <span className="font-medium text-[rgb(var(--text))]">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
      )}
      <input
        ref={ref}
        id={inputId}
        required={required}
        className={[
          'rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5',
          'text-[rgb(var(--text))] placeholder:text-[rgb(var(--text-muted))]',
          'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
          error ? 'border-red-500' : '',
          className
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  )
})
