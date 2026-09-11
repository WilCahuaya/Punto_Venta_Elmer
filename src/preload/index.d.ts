import type { LoginPayload } from '@shared/types/api';
import type { LabelPrintPayload } from '@shared/types/labels';
import type { ReportDateRange, VoidSaleInput } from '@shared/types/reports';
import type { SettingsUpdateInput } from '@shared/types/settings';
import type { CashHistoryFilters, CashMovementInput, CloseCashInput, OpenCashInput } from '@shared/types/cash';
import type { AddCreditPaymentInput, CreateSaleInput, CreditListFilters, PartialReturnInput } from '@shared/types/sales';
import type { AdjustStockInput, CategoryInput, CategoryListFilters, ProductInput, ProductListFilters } from '@shared/types/catalog';
declare const api: {
    auth: {
        login: (payload: LoginPayload) => Promise<any>;
        logout: () => Promise<any>;
        getSession: () => Promise<any>;
    };
    settings: {
        get: () => Promise<any>;
        set: (key: string, value: string) => Promise<any>;
        update: (input: SettingsUpdateInput) => Promise<any>;
        listPrinters: () => Promise<any>;
        pickLogo: () => Promise<any>;
        removeLogo: () => Promise<any>;
        logoUrl: (path: string | null) => Promise<any>;
        testPrint: () => Promise<any>;
        testLabelPrint: () => Promise<any>;
    };
    categories: {
        list: (filters?: CategoryListFilters) => Promise<any>;
        get: (id: number) => Promise<any>;
        create: (input: CategoryInput) => Promise<any>;
        update: (id: number, input: CategoryInput) => Promise<any>;
        deactivate: (id: number) => Promise<any>;
        destroy: (id: number) => Promise<any>;
    };
    products: {
        list: (filters?: ProductListFilters) => Promise<any>;
        get: (id: number) => Promise<any>;
        create: (input: ProductInput) => Promise<any>;
        update: (id: number, input: ProductInput) => Promise<any>;
        deactivate: (id: number) => Promise<any>;
        destroy: (id: number) => Promise<any>;
        pickImage: () => Promise<any>;
        imageUrl: (relativePath: string | null) => Promise<any>;
        lookupBarcode: (barcode: string) => Promise<any>;
        adjustStock: (input: AdjustStockInput) => Promise<any>;
        getSystemServiceProduct: () => Promise<any>;
    };
    cash: {
        getCurrent: () => Promise<any>;
        open: (input: OpenCashInput) => Promise<any>;
        close: (input: CloseCashInput) => Promise<any>;
        addMovement: (input: CashMovementInput) => Promise<any>;
        listMovements: (sessionId?: number) => Promise<any>;
        history: (filters?: CashHistoryFilters) => Promise<any>;
        getSession: (id: number) => Promise<any>;
    };
    sales: {
        create: (input: CreateSaleInput) => Promise<any>;
        printTicket: (saleId: number, printerName?: string) => Promise<any>;
        listBySession: (sessionId: number) => Promise<any>;
        getDetail: (id: number) => Promise<any>;
        partialReturn: (input: PartialReturnInput) => Promise<any>;
        void: (input: VoidSaleInput) => Promise<any>;
        listCredits: (filters?: CreditListFilters) => Promise<any>;
        payCredit: (input: AddCreditPaymentInput) => Promise<any>;
        listCreditPaymentsBySession: (sessionId: number) => Promise<any>;
        lookupBarcode: (barcode: string) => Promise<any>;
        searchProducts: (query: string) => Promise<any>;
    };
    dashboard: {
        getStats: () => Promise<any>;
    };
    labels: {
        checkBarcode: (barcode: string) => Promise<any>;
        print: (payload: LabelPrintPayload) => Promise<any>;
        previewPdf: (payload: LabelPrintPayload) => Promise<any>;
        historyList: () => Promise<any>;
        historyGet: (id: number) => Promise<any>;
        historyDelete: (id: number) => Promise<any>;
        historyClear: () => Promise<any>;
    };
    backup: {
        list: () => Promise<any>;
        status: () => Promise<any>;
        create: () => Promise<any>;
        restore: (id: number) => Promise<any>;
        export: (id: number) => Promise<any>;
        import: () => Promise<any>;
        delete: (id: number) => Promise<any>;
    };
    reports: {
        getSummary: (range: ReportDateRange) => Promise<any>;
        exportPdf: (range: ReportDateRange) => Promise<any>;
        exportExcel: (range: ReportDateRange) => Promise<any>;
    };
};
export type PreloadApi = typeof api;
export {};
