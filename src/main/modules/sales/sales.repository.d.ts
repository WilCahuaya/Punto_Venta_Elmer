import type Database from 'better-sqlite3';
import type { PriceMode } from '@shared/types/sales';
import type { PaymentMethod } from '@shared/lib/payment';
export interface SaleRow {
    id: number;
    ticket_number: string;
    session_id: number;
    subtotal: string;
    discount: string;
    total: string;
    amount_paid: string;
    change_amount: string;
    payment_method: string;
    is_credit: number;
    credit_to: string | null;
    price_mode: string;
    status: string;
    created_at: string;
}
export interface SaleItemRow {
    id: number;
    sale_id: number;
    product_id: number;
    product_name: string;
    barcode: string | null;
    quantity: number;
    unit_price: string;
    line_total: string;
    cost_price: string;
    stock_quantity: number | null;
}
export declare function generateTicketNumber(db: Database.Database): string;
export declare function insertSale(db: Database.Database, data: {
    ticketNumber: string;
    sessionId: number;
    subtotal: string;
    discount: string;
    total: string;
    amountPaid: string;
    changeAmount: string;
    paymentMethod: PaymentMethod;
    isCredit?: boolean;
    creditTo?: string | null;
    priceMode: PriceMode;
    createdBy: number;
}): number;
export declare function insertSaleItem(db: Database.Database, data: {
    saleId: number;
    productId: number;
    productName: string;
    barcode: string | null;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    costPrice: string;
    stockQuantity: number;
}): void;
export declare function decrementStock(db: Database.Database, productId: number, quantity: number): boolean;
export interface SaleRowFull extends SaleRow {
    voided_at: string | null;
    void_reason: string | null;
    voided_by: number | null;
    voided_by_name: string | null;
}
export declare function getSaleById(db: Database.Database, id: number): SaleRowFull | undefined;
export declare function voidSaleRecord(db: Database.Database, id: number, reason: string, voidedBy: number | null): void;
export declare function restoreStock(db: Database.Database, productId: number, quantity: number): void;
export declare function getSaleItems(db: Database.Database, saleId: number): SaleItemRow[];
export interface SaleListRow {
    id: number;
    ticket_number: string;
    session_id: number;
    created_at: string;
    subtotal: string;
    discount: string;
    total: string;
    amount_paid: string;
    change_amount: string;
    payment_method: string;
    is_credit: number;
    credit_to: string | null;
    status: string;
    void_reason: string | null;
    voided_at: string | null;
    voided_by_name: string | null;
    returned_total: string;
    item_count: number;
}
export declare function listSalesForSession(db: Database.Database, sessionId: number): SaleListRow[];
