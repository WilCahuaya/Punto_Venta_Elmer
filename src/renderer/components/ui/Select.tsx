interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  error?: string
  required?: boolean
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  required
}: SelectProps): React.JSX.Element {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && (
        <span className="font-medium">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={[
          'rounded-lg border border-surface-border bg-surface-elevated px-3 py-2.5',
          'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
          error ? 'border-red-500' : ''
        ].join(' ')}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  )
}
