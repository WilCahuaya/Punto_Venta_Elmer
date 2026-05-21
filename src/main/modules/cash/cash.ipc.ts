import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import type { CashHistoryFilters, CashMovementInput, CloseCashInput, OpenCashInput } from '@shared/types/cash'
import {
  addCashMovementService,
  closeCashService,
  getCashSessionService,
  getCurrentCashService,
  listCashHistoryService,
  listCashMovementsService,
  openCashService
} from './cash.service'

export function registerCashIpc(): void {
  ipcMain.handle(IPC_CHANNELS.CASH_GET_CURRENT, () => getCurrentCashService())
  ipcMain.handle(IPC_CHANNELS.CASH_OPEN, (_e, input: OpenCashInput) => openCashService(input))
  ipcMain.handle(IPC_CHANNELS.CASH_CLOSE, (_e, input: CloseCashInput) => closeCashService(input))
  ipcMain.handle(IPC_CHANNELS.CASH_ADD_MOVEMENT, (_e, input: CashMovementInput) =>
    addCashMovementService(input)
  )
  ipcMain.handle(IPC_CHANNELS.CASH_LIST_MOVEMENTS, (_e, sessionId?: number) =>
    listCashMovementsService(sessionId)
  )
  ipcMain.handle(IPC_CHANNELS.CASH_HISTORY, (_e, filters?: CashHistoryFilters) =>
    listCashHistoryService(filters ?? {})
  )
  ipcMain.handle(IPC_CHANNELS.CASH_GET_SESSION, (_e, id: number) => getCashSessionService(id))
}
