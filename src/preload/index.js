import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
const api = {
    auth: {
        login: (payload) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, payload),
        logout: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),
        getSession: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_SESSION)
    },
    settings: {
        get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
        set: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
        update: (input) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, input),
        listPrinters: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_LIST_PRINTERS),
        pickLogo: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_PICK_LOGO),
        removeLogo: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_REMOVE_LOGO),
        logoUrl: (path) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_LOGO_URL, path),
        testPrint: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_TEST_PRINT),
        testLabelPrint: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_TEST_LABEL_PRINT)
    },
    categories: {
        list: (filters) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_LIST, filters),
        get: (id) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_GET, id),
        create: (input) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_CREATE, input),
        update: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_UPDATE, id, input),
        deactivate: (id) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_DEACTIVATE, id),
        destroy: (id) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_DESTROY, id)
    },
    products: {
        list: (filters) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_LIST, filters),
        get: (id) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_GET, id),
        create: (input) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_CREATE, input),
        update: (id, input) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_UPDATE, id, input),
        deactivate: (id) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_DEACTIVATE, id),
        destroy: (id) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_DESTROY, id),
        pickImage: () => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_PICK_IMAGE),
        imageUrl: (relativePath) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_IMAGE_URL, relativePath),
        lookupBarcode: (barcode) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_LOOKUP, barcode),
        adjustStock: (input) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_ADJUST_STOCK, input),
        getSystemServiceProduct: () => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_SYSTEM_SERVICE)
    },
    cash: {
        getCurrent: () => ipcRenderer.invoke(IPC_CHANNELS.CASH_GET_CURRENT),
        open: (input) => ipcRenderer.invoke(IPC_CHANNELS.CASH_OPEN, input),
        close: (input) => ipcRenderer.invoke(IPC_CHANNELS.CASH_CLOSE, input),
        addMovement: (input) => ipcRenderer.invoke(IPC_CHANNELS.CASH_ADD_MOVEMENT, input),
        listMovements: (sessionId) => ipcRenderer.invoke(IPC_CHANNELS.CASH_LIST_MOVEMENTS, sessionId),
        history: (filters) => ipcRenderer.invoke(IPC_CHANNELS.CASH_HISTORY, filters),
        getSession: (id) => ipcRenderer.invoke(IPC_CHANNELS.CASH_GET_SESSION, id)
    },
    sales: {
        create: (input) => ipcRenderer.invoke(IPC_CHANNELS.SALES_CREATE, input),
        printTicket: (saleId, printerName) => ipcRenderer.invoke(IPC_CHANNELS.SALES_PRINT_TICKET, saleId, printerName),
        listBySession: (sessionId) => ipcRenderer.invoke(IPC_CHANNELS.SALES_LIST_BY_SESSION, sessionId),
        getDetail: (id) => ipcRenderer.invoke(IPC_CHANNELS.SALES_GET_DETAIL, id),
        partialReturn: (input) => ipcRenderer.invoke(IPC_CHANNELS.SALES_PARTIAL_RETURN, input),
        void: (input) => ipcRenderer.invoke(IPC_CHANNELS.SALES_VOID, input),
        listCredits: (filters) => ipcRenderer.invoke(IPC_CHANNELS.SALES_CREDIT_LIST, filters),
        payCredit: (input) => ipcRenderer.invoke(IPC_CHANNELS.SALES_CREDIT_PAY, input),
        listCreditPaymentsBySession: (sessionId) => ipcRenderer.invoke(IPC_CHANNELS.SALES_CREDIT_PAYMENTS_BY_SESSION, sessionId),
        lookupBarcode: (barcode) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_LOOKUP, barcode),
        searchProducts: (query) => ipcRenderer.invoke(IPC_CHANNELS.PRODUCTS_SEARCH_POS, query)
    },
    dashboard: {
        getStats: () => ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_STATS)
    },
    labels: {
        checkBarcode: (barcode) => ipcRenderer.invoke(IPC_CHANNELS.LABELS_CHECK_BARCODE, barcode),
        print: (payload) => ipcRenderer.invoke(IPC_CHANNELS.LABELS_PRINT, payload),
        previewPdf: (payload) => ipcRenderer.invoke(IPC_CHANNELS.LABELS_PREVIEW_PDF, payload),
        historyList: () => ipcRenderer.invoke(IPC_CHANNELS.LABELS_HISTORY_LIST),
        historyGet: (id) => ipcRenderer.invoke(IPC_CHANNELS.LABELS_HISTORY_GET, id),
        historyDelete: (id) => ipcRenderer.invoke(IPC_CHANNELS.LABELS_HISTORY_DELETE, id),
        historyClear: () => ipcRenderer.invoke(IPC_CHANNELS.LABELS_HISTORY_CLEAR)
    },
    backup: {
        list: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_LIST),
        status: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_STATUS),
        create: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CREATE),
        restore: (id) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RESTORE, id),
        export: (id) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_EXPORT, id),
        import: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_IMPORT),
        delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_DELETE, id)
    },
    reports: {
        getSummary: (range) => ipcRenderer.invoke(IPC_CHANNELS.REPORTS_SUMMARY, range),
        exportPdf: (range) => ipcRenderer.invoke(IPC_CHANNELS.REPORTS_EXPORT_PDF, range),
        exportExcel: (range) => ipcRenderer.invoke(IPC_CHANNELS.REPORTS_EXPORT_EXCEL, range)
    }
};
contextBridge.exposeInMainWorld('api', api);
