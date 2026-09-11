import type { ApiResult } from '@shared/types/api';
import type { ReportDateRange, ReportSummary } from '@shared/types/reports';
export declare function getReportSummaryService(range: ReportDateRange): ApiResult<ReportSummary>;
export declare function exportReportPdfService(range: ReportDateRange): Promise<ApiResult<string>>;
export declare function exportReportExcelService(range: ReportDateRange): Promise<ApiResult<string>>;
