import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { addCashMovementService, closeCashService, getCashSessionService, getCurrentCashService, listCashHistoryService, listCashMovementsService, openCashService } from './cash.service';
export function registerCashIpc() {
    ipcMain.handle(IPC_CHANNELS.CASH_GET_CURRENT, () => getCurrentCashService());
    ipcMain.handle(IPC_CHANNELS.CASH_OPEN, (_e, input) => openCashService(input));
    ipcMain.handle(IPC_CHANNELS.CASH_CLOSE, (_e, input) => closeCashService(input));
    ipcMain.handle(IPC_CHANNELS.CASH_ADD_MOVEMENT, (_e, input) => addCashMovementService(input));
    ipcMain.handle(IPC_CHANNELS.CASH_LIST_MOVEMENTS, (_e, sessionId) => listCashMovementsService(sessionId));
    ipcMain.handle(IPC_CHANNELS.CASH_HISTORY, (_e, filters) => listCashHistoryService(filters ?? {}));
    ipcMain.handle(IPC_CHANNELS.CASH_GET_SESSION, (_e, id) => getCashSessionService(id));
}
