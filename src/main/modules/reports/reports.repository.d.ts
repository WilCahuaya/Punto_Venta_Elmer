import type Database from 'better-sqlite3';
import type { ReportDateRange } from '@shared/types/reports';
export interface SaleListRow {
    id: number;
    ticket_number: string;
    created_at: string;
    subtotal: string;
    discount: string;
    total: string;
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
export interface TopProductRow {
    product_id: number;
    product_name: string;
    qty: number;
    revenue: string;
}
export interface SummaryRow {
    completed_count: number;
    completed_total: string;
    returns_total: string;
    cash_total: string;
    cash_returns: string;
    yape_total: string;
    yape_returns: string;
    profit: string;
    voided_count: number;
    voided_total: string;
}
export declare function getReportSummary(db: Database.Database, range: ReportDateRange): SummaryRow;
export declare function listAllSalesInRange(db: Database.Database, range: ReportDateRange): SaleListRow[];
export declare function listSalesInRange(db: Database.Database, range: ReportDateRange, status: 'completed' | 'voided'): SaleListRow[];
export declare function getTopProductsInRange(db: Database.Database, range: ReportDateRange, limit?: number): TopProductRow[];
export declare function sumCreditPaymentsInRange(db: Database.Database, range: ReportDateRange, paymentMethod: 'cash' | 'yape'): number;
