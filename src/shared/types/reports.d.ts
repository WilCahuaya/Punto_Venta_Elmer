import type { PaymentMethod } from '../lib/payment';
export interface ReportDateRange {
    dateFrom: string;
    dateTo: string;
}
export interface ReportSaleRow {
    id: number;
    ticketNumber: string;
    createdAt: string;
    subtotal: number;
    discount: number;
    total: number;
    netTotal: number;
    returnedTotal: number;
    paymentMethod: PaymentMethod;
    isCredit: boolean;
    creditTo: string | null;
    status: 'completed' | 'voided';
    voidReason: string | null;
    voidedAt: string | null;
    voidedByName: string | null;
    itemCount: number;
}
export interface ReportTopProduct {
    productId: number;
    productName: string;
    quantitySold: number;
    revenue: number;
}
export interface ReportSummary {
    dateFrom: string;
    dateTo: string;
    completedCount: number;
    completedTotal: number;
    returnsTotal: number;
    netCompletedTotal: number;
    cashNetTotal: number;
    yapeNetTotal: number;
    profit: number;
    voidedCount: number;
    voidedTotal: number;
    topProducts: ReportTopProduct[];
    /** Historial unificado (completadas y anuladas). */
    allSales: ReportSaleRow[];
    sales: ReportSaleRow[];
    voidedSales: ReportSaleRow[];
}
export interface VoidSaleInput {
    saleId: number;
    reason: string;
}
