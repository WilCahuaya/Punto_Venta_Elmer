export function isPaymentMethod(value) {
    return value === 'cash' || value === 'yape';
}
export function normalizePaymentMethod(value) {
    return value === 'yape' ? 'yape' : 'cash';
}
export function paymentMethodLabel(method) {
    return normalizePaymentMethod(method) === 'yape' ? 'Yape' : 'Efectivo';
}
export function salePaymentLabel(sale) {
    if (sale.isCredit)
        return 'Fiado';
    return paymentMethodLabel(sale.paymentMethod);
}
