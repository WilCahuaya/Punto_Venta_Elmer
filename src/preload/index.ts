import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import type { LoginPayload } from '@shared/types/api'
import type { LabelPrintPayload } from '@shared/types/labels'
import type { ReportDateRange, VoidSaleInput } from '@shared/types/reports'
import type { SettingsUpdateInput } from '@shared/types/settings'
import type {
  CashHistoryFilters,
  CashMovementInput,
  CloseCashInput,
  OpenCashInput
} from '@shared/types/cash'
import type { CreateSaleInput, PartialReturnInput } from '@shared/types/sales'
import type {
  AdjustStockInput,
  CategoryInput,
  CategoryListFilters,
  ProductInput,
  ProductListFilters
} from '@shared/types/catalog'

const api = {
  auth: {
    login: (payload: LoginPayload) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, payload),
    logout: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),
    getSession: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_SESSION)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    set: (key: string, value: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
    update: (input: SettingsUpdateInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, input),
    listPrinters: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_LIST_PRINTERS),
    pickLogo: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_PICK_LOGO),
    removeLogo: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_REMOVE_LOGO),
    logoUrl: (path: string | null) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_LOGO_URL, path),
    testPrint: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_TEST_PRINT),
    testLabelPrint: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_TEST_LABEL_PRINT)
  },
  categories: {
    list: (filters?: CategoryListFilters) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_LIST, filters),
    get: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_GET, id),
    create: (input: CategoryInput) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_CREATE, input),
    update: (id: number, input: CategoryInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_UPDATE, id, input),
    deactivate: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_DEACTIVATE, id),
    destroy: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_DESTROY, id)
  },
  products: {
    list: (filters?: ProductListFilters) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_LIST, filters),
    get: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_GET, id),
    create: (input: ProductInput) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_CREATE, input),
    update: (id: number, input: ProductInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_UPDATE, id, input),
    deactivate: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_DEACTIVATE, id),
    destroy: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_DESTROY, id),
    pickImage: () => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_PICK_IMAGE),
    imageUrl: (relativePath: string | null) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_IMAGE_URL, relativePath),
    lookupBarcode: (barcode: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_LOOKUP, barcode),
    adjustStock: (input: AdjustStockInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_ADJUST_STOCK, input),
    getSystemServiceProduct: () => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_SYSTEM_SERVICE)
  },
  cash: {
    getCurrent: () => ipcRenderer.invoke(IPC_CHANNELS.CASH_GET_CURRENT),
    open: (input: OpenCashInput) => ipcRenderer.invoke(IPC_CHANNELS.CASH_OPEN, input),
    close: (input: CloseCashInput) => ipcRenderer.invoke(IPC_CHANNELS.CASH_CLOSE, input),
    addMovement: (input: CashMovementInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.CASH_ADD_MOVEMENT, input),
    listMovements: (sessionId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.CASH_LIST_MOVEMENTS, sessionId),
    history: (filters?: CashHistoryFilters) =>
      ipcRenderer.invoke(IPC_CHANNELS.CASH_HISTORY, filters),
    getSession: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.CASH_GET_SESSION, id)
  },
  sales: {
    create: (input: CreateSaleInput) => ipcRenderer.invoke(IPC_CHANNELS.SALES_CREATE, input),
    printTicket: (saleId: number) => ipcRenderer.invoke(IPC_CHANNELS.SALES_PRINT_TICKET, saleId),
    listBySession: (sessionId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SALES_LIST_BY_SESSION, sessionId),
    getDetail: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.SALES_GET_DETAIL, id),
    partialReturn: (input: PartialReturnInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.SALES_PARTIAL_RETURN, input),
    void: (input: VoidSaleInput) => ipcRenderer.invoke(IPC_CHANNELS.SALES_VOID, input),
    lookupBarcode: (barcode: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_LOOKUP, barcode),
    searchProducts: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_SEARCH_POS, query)
  },
  dashboard: {
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_STATS)
  },
  labels: {
    checkBarcode: (barcode: string) => ipcRenderer.invoke(IPC_CHANNELS.LABELS_CHECK_BARCODE, barcode),
    print: (payload: LabelPrintPayload) => ipcRenderer.invoke(IPC_CHANNELS.LABELS_PRINT, payload),
    previewPdf: (payload: LabelPrintPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.LABELS_PREVIEW_PDF, payload)
  },
  backup: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_LIST),
    status: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_STATUS),
    create: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CREATE),
    restore: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RESTORE, id),
    export: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_EXPORT, id),
    import: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_IMPORT),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_DELETE, id)
  },
  reports: {
    getSummary: (range: ReportDateRange) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORTS_SUMMARY, range),
    exportPdf: (range: ReportDateRange) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORTS_EXPORT_PDF, range),
    exportExcel: (range: ReportDateRange) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORTS_EXPORT_EXCEL, range)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type PreloadApi = typeof api
