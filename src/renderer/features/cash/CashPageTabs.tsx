export type CashPageTab = 'turno' | 'tickets' | 'cierres'

export const CASH_TABS: { id: CashPageTab; label: string }[] = [
  { id: 'turno', label: 'Turno' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'cierres', label: 'Cierres' }
]

export function parseCashTab(value: string | null): CashPageTab {
  if (value === 'tickets' || value === 'cierres') return value
  return 'turno'
}
