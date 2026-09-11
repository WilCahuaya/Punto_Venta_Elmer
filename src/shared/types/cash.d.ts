export type CashSessionStatus = 'open' | 'closed';
export type CashMovementType = 'income' | 'expense';
export interface CashSession {
    id: number;
    openedAt: string;
    closedAt: string | null;
    openingAmount: number;
    closingAmount: number | null;
    expectedAmount: number | null;
    difference: number | null;
    status: CashSessionStatus;
    openedByName: string | null;
    closedByName: string | null;
    notes: string | null;
}
export interface CashSessionSummary extends CashSession {
    totalIncome: number;
    totalExpense: number;
    /** Ventas completadas cobradas en efectivo (bruto del ticket). */
    totalSalesGross: number;
    /** Ventas completadas cobradas por Yape (bruto). */
    totalYapeGross: number;
    /** Devoluciones de ventas en efectivo (sale del cajón). */
    totalReturns: number;
    /** Devoluciones de ventas Yape (no sale del cajón). */
    totalYapeReturns: number;
    /** Ventas netas en efectivo = bruto − devoluciones; base del efectivo esperado. */
    totalSales: number;
    /** Ventas netas por Yape. */
    totalYape: number;
    /** Abonos/adelantos de fiados en efectivo de este turno (reembolsos restan). */
    creditCashCollected: number;
    /** Abonos/adelantos de fiados por Yape de este turno (no entran al cajón). */
    creditYapeCollected: number;
    salesProfit: number;
    /** Apertura + ingresos − egresos + ventas netas en efectivo + abonos fiado efectivo. */
    expectedInDrawer: number;
}
export interface CashMovement {
    id: number;
    sessionId: number;
    type: CashMovementType;
    amount: number;
    concept: string;
    reference: string | null;
    createdAt: string;
    createdByName: string | null;
}
export interface OpenCashInput {
    openingAmount: number;
}
export interface CloseCashInput {
    closingAmount: number;
    notes?: string | null;
}
export interface CashMovementInput {
    type: CashMovementType;
    amount: number;
    concept: string;
    reference?: string | null;
}
export interface CashHistoryFilters {
    limit?: number;
}
