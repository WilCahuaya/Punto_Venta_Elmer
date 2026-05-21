import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import type { ProductInput, ProductListFilters } from '@shared/types/catalog'
import {
  createProductService,
  deleteProductService,
  getProductImageUrlService,
  getProductService,
  listProductsService,
  pickProductImageService,
  updateProductService
} from './products.service'

export function registerProductsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_LIST, (_e, filters?: ProductListFilters) =>
    listProductsService(filters ?? {})
  )
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GET, (_e, id: number) => getProductService(id))
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_CREATE, (_e, input: ProductInput) =>
    createProductService(input)
  )
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_UPDATE, (_e, id: number, input: ProductInput) =>
    updateProductService(id, input)
  )
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_DELETE, (_e, id: number) => deleteProductService(id))
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_PICK_IMAGE, () => pickProductImageService())
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_IMAGE_URL, (_e, relativePath: string | null) =>
    getProductImageUrlService(relativePath)
  )
}
