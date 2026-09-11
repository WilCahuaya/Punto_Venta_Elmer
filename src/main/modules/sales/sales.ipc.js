import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { printSaleTicket } from '../../services/printer.service';
import { addCreditPaymentService, createSaleService, getSaleDetailService, listCreditPaymentsForSessionService, listCreditSalesService, listSalesForSessionService, partialReturnService, voidSaleService } from './sales.service';
import { searchProductsPosService } from '../products/products.service';
export function registerSalesIpc() {
    ipcMain.handle(IPC_CHANNELS.SALES_CREATE, (_e, input) => createSaleService(input));
    ipcMain.handle(IPC_CHANNELS.SALES_PRINT_TICKET, async (_e, saleId, printerName) => {
        const result = await printSaleTicket(saleId, printerName);
        if (!result.ok)
            return { ok: false, error: result.error ?? 'Error de impresión' };
        return { ok: true, data: null };
    });
    ipcMain.handle(IPC_CHANNELS.PRODUCTS_SEARCH_POS, (_e, query) => searchProductsPosService(query));
    ipcMain.handle(IPC_CHANNELS.SALES_LIST_BY_SESSION, (_e, sessionId) => listSalesForSessionService(sessionId));
    ipcMain.handle(IPC_CHANNELS.SALES_GET_DETAIL, (_e, id) => getSaleDetailService(id));
    ipcMain.handle(IPC_CHANNELS.SALES_PARTIAL_RETURN, (_e, input) => partialReturnService(input));
    ipcMain.handle(IPC_CHANNELS.SALES_VOID, (_e, input) => voidSaleService(input.saleId, input.reason));
    ipcMain.handle(IPC_CHANNELS.SALES_CREDIT_LIST, (_e, filters) => listCreditSalesService(filters ?? {}));
    ipcMain.handle(IPC_CHANNELS.SALES_CREDIT_PAY, (_e, input) => addCreditPaymentService(input));
    ipcMain.handle(IPC_CHANNELS.SALES_CREDIT_PAYMENTS_BY_SESSION, (_e, sessionId) => listCreditPaymentsForSessionService(sessionId));
}
