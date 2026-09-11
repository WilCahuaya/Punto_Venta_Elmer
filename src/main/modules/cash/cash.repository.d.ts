import type Database from 'better-sqlite3';
import type { CashHistoryFilters } from '@shared/types/cash';
export interface CashSessionRow {
    id: number;
    opened_at: string;
    closed_at: string | null;
    opening_amount: string;
    closing_amount: string | null;
    expected_amount: string | null;
    difference: string | null;
    status: string;
    notes: string | null;
    opened_by_name: string | null;
    closed_by_name: string | null;
}
export interface CashMovementRow {
    id: number;
    session_id: number;
    type: string;
    amount: string;
    concept: string;
    reference: string | null;
    created_at: string;
    created_by_name: string | null;
}
export declare function getOpenSession(db: Database.Database): CashSessionRow | undefined;
export declare function getSessionById(db: Database.Database, id: number): CashSessionRow | undefined;
export declare function insertSession(db: Database.Database, data: {
    openingAmount: string;
    openedBy: number;
}): number;
export declare function closeSession(db: Database.Database, id: number, data: {
    closingAmount: string;
    expectedAmount: string;
    difference: string;
    notes: string | null;
    closedBy: number;
}): void;
export declare function sumMovements(db: Database.Database, sessionId: number, type: 'income' | 'expense'): number;
export declare function sumSalesGross(db: Database.Database, sessionId: number, paymentMethod?: 'cash' | 'yape'): number;
export declare function sumReturnsInSession(db: Database.Database, sessionId: number, paymentMethod?: 'cash' | 'yape'): number;
/** Ventas netas del turno (bruto − devoluciones). Filtrar por método para el efectivo esperado. */
export declare function sumSales(db: Database.Database, sessionId: number, paymentMethod?: 'cash' | 'yape'): number;
export declare function sumSalesProfit(db: Database.Database, sessionId: number): number;
export declare function insertMovement(db: Database.Database, data: {
    sessionId: number;
    type: string;
    amount: string;
    concept: string;
    reference: string | null;
    createdBy: number;
}): number;
export declare function listMovements(db: Database.Database, sessionId: number): CashMovementRow[];
export declare function listSessionHistory(db: Database.Database, filters: CashHistoryFilters): CashSessionRow[];
