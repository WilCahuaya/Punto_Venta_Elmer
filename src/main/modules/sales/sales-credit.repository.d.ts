import type Database from 'better-sqlite3';
import type { CreditListFilters, CreditPaymentKind } from '@shared/types/sales';
import type { PaymentMethod } from '@shared/lib/payment';
export declare const CREDIT_PAID_SQL = "(\n  SELECT COALESCE(SUM(CASE WHEN p.kind = 'refund' THEN -p.amount ELSE p.amount END), 0)\n  FROM sale_credit_payments p\n  WHERE p.sale_id = s.id\n)";
export interface CreditPaymentRow {
    id: number;
    sale_id: number;
    session_id: number;
    amount: string;
    payment_method: string;
    kind: string;
    created_at: string;
    created_by_name: string | null;
    ticket_number?: string | null;
    credit_to?: string | null;
}
export interface CreditSaleListRow {
    id: number;
    ticket_number: string;
    credit_to: string;
    created_at: string;
    total: string;
    returned_total: string;
    paid_total: string;
}
export interface CreditSaleItemRow {
    product_name: string;
    quantity: number;
    returned_quantity: number;
    unit_price: string;
    line_total: string;
}
export declare function insertCreditPayment(db: Database.Database, data: {
    saleId: number;
    sessionId: number;
    amount: string;
    paymentMethod: PaymentMethod;
    kind: CreditPaymentKind;
    createdBy: number | null;
}): number;
export declare function getCreditPaidTotal(db: Database.Database, saleId: number): number;
export declare function getCreditPaidByMethod(db: Database.Database, saleId: number, method: PaymentMethod): number;
export declare function countCreditPayments(db: Database.Database, saleId: number): number;
export declare function listCreditPayments(db: Database.Database, saleId: number): CreditPaymentRow[];
export declare function listCreditPaymentsForSession(db: Database.Database, sessionId: number): CreditPaymentRow[];
export declare function sumCreditPaymentsInSession(db: Database.Database, sessionId: number, paymentMethod?: PaymentMethod): number;
export declare function updateSaleAmountPaid(db: Database.Database, saleId: number, amountPaid: string): void;
export declare function listCreditSales(db: Database.Database, filters: CreditListFilters): CreditSaleListRow[];
export declare function getCreditSaleRow(db: Database.Database, saleId: number): CreditSaleListRow | undefined;
export declare function listCreditSaleItems(db: Database.Database, saleId: number): CreditSaleItemRow[];
