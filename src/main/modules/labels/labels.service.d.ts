import type { ApiResult } from '@shared/types/api';
import type { LabelPdfPreviewResult, LabelPrintHistoryJob, LabelPrintHistorySummary, LabelPrintPayload } from '@shared/types/labels';
export declare function checkBarcodeService(barcode: string): ApiResult<{
    exists: boolean;
}>;
export declare function printLabelsService(payload: LabelPrintPayload): Promise<ApiResult<{
    printed: number;
    sheets?: number;
}>>;
export declare function listLabelPrintHistoryService(): ApiResult<LabelPrintHistorySummary[]>;
export declare function getLabelPrintHistoryJobService(id: number): ApiResult<LabelPrintHistoryJob>;
export declare function deleteLabelPrintHistoryJobService(id: number): ApiResult<{
    deleted: boolean;
}>;
export declare function clearLabelPrintHistoryService(): ApiResult<{
    deleted: number;
}>;
export declare function previewLabelsPdfService(payload: LabelPrintPayload): Promise<ApiResult<LabelPdfPreviewResult>>;
