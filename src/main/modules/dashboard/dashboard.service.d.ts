import type { ApiResult } from '@shared/types/api';
import type { DashboardStats } from '@shared/types/dashboard';
/** KPIs del día alineados con Reportes (misma consulta y totales netos). */
export declare function getDashboardStatsService(): ApiResult<DashboardStats>;
