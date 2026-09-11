import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { adjustStockService, createProductService, deactivateProductService, destroyProductService, getProductImageUrlService, getProductService, getSystemServiceProductService, listProductsService, lookupProductByBarcodeService, pickProductImageService, updateProductService } from './products.service';
export function registerProductsIpc() {
    ipcMain.handle(IPC_CHANNELS.PRODUCTS_LIST, (_e, filters) => listProductsService(filters ?? {}));
    ipcMain.handle(IPC_CHANNELS.PRODUCTS_GET, (_e, id) => getProductService(id));
    ipcMain.handle(IPC_CHANNELS.PRODUCTS_SYSTEM_SERVICE, () => getSystemServiceProductService());
    ipcMain.handle(IPC_CHANNELS.PRODUCTS_CREATE, (_e, input) => createProductService(input));
    ipcMain.handle(IPC_CHANNELS.PRODUCTS_UPDATE, (_e, id, input) => updateProductService(id, input));
    ipcMain.handle(IPC_CHANNELS.PRODUCTS_DEACTIVATE, (_e, id) => deactivateProductService(id));
    ipcMain.handle(IPC_CHANNELS.PRODUCTS_DESTROY, (_e, id) => destroyProductService(id));
    ipcMain.handle(IPC_CHANNELS.PRODUCTS_PICK_IMAGE, () => pickProductImageService());
    ipcMain.handle(IPC_CHANNELS.PRODUCTS_IMAGE_URL, (_e, relativePath) => getProductImageUrlService(relativePath));
    ipcMain.handle(IPC_CHANNELS.PRODUCTS_LOOKUP, (_e, barcode) => lookupProductByBarcodeService(barcode));
    ipcMain.handle(IPC_CHANNELS.PRODUCTS_ADJUST_STOCK, (_e, input) => adjustStockService(input));
}
