export type PaymentMethod = 'cash' | 'yape';
export declare function isPaymentMethod(value: unknown): value is PaymentMethod;
export declare function normalizePaymentMethod(value: unknown): PaymentMethod;
export declare function paymentMethodLabel(method: PaymentMethod | string | null | undefined): string;
export declare function salePaymentLabel(sale: {
    isCredit?: boolean | null;
    paymentMethod?: PaymentMethod | string | null;
}): string;
