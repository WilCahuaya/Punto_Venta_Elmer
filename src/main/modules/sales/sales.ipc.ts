import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import type { CreateSaleInput } from '@shared/types/sales'
import { printSaleTicket } from '../../services/printer.service'
import { createSaleService, lookupBarcodeForPos, voidSaleService } from './sales.service'
import type { VoidSaleInput } from '@shared/types/reports'
import { searchProductsPosService } from '../products/products.service'
import type { PriceMode } from '@shared/types/sales'

export function registerSalesIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SALES_CREATE, (_e, input: CreateSaleInput) =>
    createSaleService(input)
  )
  ipcMain.handle(IPC_CHANNELS.SALES_PRINT_TICKET, async (_e, saleId: number) => {
    const result = await printSaleTicket(saleId)
    if (!result.ok) return { ok: false as const, error: result.error ?? 'Error de impresión' }
    return { ok: true as const, data: null }
  })
  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_LOOKUP_BARCODE,
    (_e, barcode: string, priceMode: PriceMode) => lookupBarcodeForPos(barcode, priceMode)
  )
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_SEARCH_POS, (_e, query: string) =>
    searchProductsPosService(query)
  )
  ipcMain.handle(IPC_CHANNELS.SALES_VOID, (_e, input: VoidSaleInput) =>
    voidSaleService(input.saleId, input.reason)
  )
}
