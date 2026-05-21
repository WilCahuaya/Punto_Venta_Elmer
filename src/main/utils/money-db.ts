import { roundMoney } from '@shared/lib/currency'

/** Convierte número a string DECIMAL(12,2) para SQLite. */
export function toMoneyDb(value: number): string {
  return roundMoney(value).toFixed(2)
}

/** Lee DECIMAL de SQLite como número con 2 decimales. */
export function fromMoneyDb(value: string | number | null | undefined): number {
  if (value == null) return 0
  return roundMoney(Number(value))
}
