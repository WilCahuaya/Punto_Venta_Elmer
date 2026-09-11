import type { ApiResult } from '@shared/types/api';
import type { CashHistoryFilters, CashMovement, CashMovementInput, CashSessionSummary, CloseCashInput, OpenCashInput } from '@shared/types/cash';
export declare function getCurrentCashService(): ApiResult<CashSessionSummary | null>;
export declare function getCashSessionService(id: number): ApiResult<CashSessionSummary>;
export declare function openCashService(input: OpenCashInput): ApiResult<CashSessionSummary>;
export declare function closeCashService(input: CloseCashInput): ApiResult<CashSessionSummary>;
export declare function addCashMovementService(input: CashMovementInput): ApiResult<CashMovement>;
export declare function listCashMovementsService(sessionId?: number): ApiResult<CashMovement[]>;
export declare function listCashHistoryService(filters?: CashHistoryFilters): ApiResult<CashSessionSummary[]>;
