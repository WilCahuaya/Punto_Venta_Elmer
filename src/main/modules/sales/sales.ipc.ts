import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import type { CreateSaleInput } from '@shared/types/sales'
import { printSaleTicket } from '../../services/printer.service'
import {
  createSaleService,
  getSaleDetailService,
  listSalesForSessionService,
  partialReturnService,
  voidSaleService
} from './sales.service'
import type { PartialReturnInput } from '@shared/types/sales'
import type { VoidSaleInput } from '@shared/types/reports'
import { searchProductsPosService } from '../products/products.service'
export function registerSalesIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SALES_CREATE, (_e, input: CreateSaleInput) =>
    createSaleService(input)
  )
  ipcMain.handle(
    IPC_CHANNELS.SALES_PRINT_TICKET,
    async (_e, saleId: number, printerName?: string) => {
      const result = await printSaleTicket(saleId, printerName)
      if (!result.ok) return { ok: false as const, error: result.error ?? 'Error de impresión' }
      return { ok: true as const, data: null }
    }
  )
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_SEARCH_POS, (_e, query: string) =>
    searchProductsPosService(query)
  )
  ipcMain.handle(IPC_CHANNELS.SALES_LIST_BY_SESSION, (_e, sessionId: number) =>
    listSalesForSessionService(sessionId)
  )
  ipcMain.handle(IPC_CHANNELS.SALES_GET_DETAIL, (_e, id: number) =>
    getSaleDetailService(id)
  )
  ipcMain.handle(IPC_CHANNELS.SALES_PARTIAL_RETURN, (_e, input: PartialReturnInput) =>
    partialReturnService(input)
  )
  ipcMain.handle(IPC_CHANNELS.SALES_VOID, (_e, input: VoidSaleInput) =>
    voidSaleService(input.saleId, input.reason)
  )
}
