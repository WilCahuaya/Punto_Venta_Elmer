import type { ApiResult } from '@shared/types/api';
import type { AppSettingsFull, PrinterInfo, SettingsUpdateInput } from '@shared/types/settings';
export declare function getSettings(): ApiResult<AppSettingsFull>;
export declare function updateSettings(input: SettingsUpdateInput): ApiResult<AppSettingsFull>;
export declare function setSetting(key: string, value: string): ApiResult<AppSettingsFull>;
export declare function listPrintersService(): Promise<ApiResult<PrinterInfo[]>>;
export declare function pickCompanyLogoService(): Promise<ApiResult<AppSettingsFull>>;
export declare function removeCompanyLogoService(): ApiResult<AppSettingsFull>;
export declare function getLogoUrlService(relativePath: string | null): ApiResult<string | null>;
export declare function testPrintLabelService(): Promise<ApiResult<null>>;
export declare function testPrintTicketService(): Promise<ApiResult<{
    method?: string;
}>>;
