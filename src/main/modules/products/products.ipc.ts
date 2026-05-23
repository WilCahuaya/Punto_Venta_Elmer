import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import type { ProductInput, ProductListFilters } from '@shared/types/catalog'
import type { AdjustStockInput } from '@shared/types/catalog'
import {
  adjustStockService,
  createProductService,
  deactivateProductService,
  destroyProductService,
  getProductImageUrlService,
  getProductService,
  getSystemServiceProductService,
  listProductsService,
  lookupProductByBarcodeService,
  pickProductImageService,
  updateProductService
} from './products.service'

export function registerProductsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_LIST, (_e, filters?: ProductListFilters) =>
    listProductsService(filters ?? {})
  )
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GET, (_e, id: number) => getProductService(id))
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_SYSTEM_SERVICE, () => getSystemServiceProductService())
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_CREATE, (_e, input: ProductInput) =>
    createProductService(input)
  )
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_UPDATE, (_e, id: number, input: ProductInput) =>
    updateProductService(id, input)
  )
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_DEACTIVATE, (_e, id: number) =>
    deactivateProductService(id)
  )
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_DESTROY, (_e, id: number) => destroyProductService(id))
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_PICK_IMAGE, () => pickProductImageService())
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_IMAGE_URL, (_e, relativePath: string | null) =>
    getProductImageUrlService(relativePath)
  )
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_LOOKUP, (_e, barcode: string) =>
    lookupProductByBarcodeService(barcode)
  )
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_ADJUST_STOCK, (_e, input: AdjustStockInput) =>
    adjustStockService(input)
  )
}
