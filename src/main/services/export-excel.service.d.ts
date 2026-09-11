import type { ReportSummary } from '@shared/types/reports';
export declare function writeReportExcel(filePath: string, report: ReportSummary, companyName: string, currencySymbol: string): Promise<void>;
