export type PaymentMethod = 'cash' | 'yape'

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === 'cash' || value === 'yape'
}

export function normalizePaymentMethod(value: unknown): PaymentMethod {
  return value === 'yape' ? 'yape' : 'cash'
}

export function paymentMethodLabel(method: PaymentMethod | string | null | undefined): string {
  return normalizePaymentMethod(method) === 'yape' ? 'Yape' : 'Efectivo'
}

export function salePaymentLabel(sale: {
  isCredit?: boolean | null
  paymentMethod?: PaymentMethod | string | null
}): string {
  if (sale.isCredit) return 'Fiado'
  return paymentMethodLabel(sale.paymentMethod)
}
