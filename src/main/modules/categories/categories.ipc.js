import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { createCategoryService, deactivateCategoryService, destroyCategoryService, getCategoryService, listCategoriesService, updateCategoryService } from './categories.service';
export function registerCategoriesIpc() {
    ipcMain.handle(IPC_CHANNELS.CATEGORIES_LIST, (_e, filters) => listCategoriesService(filters ?? {}));
    ipcMain.handle(IPC_CHANNELS.CATEGORIES_GET, (_e, id) => getCategoryService(id));
    ipcMain.handle(IPC_CHANNELS.CATEGORIES_CREATE, (_e, input) => createCategoryService(input));
    ipcMain.handle(IPC_CHANNELS.CATEGORIES_UPDATE, (_e, id, input) => updateCategoryService(id, input));
    ipcMain.handle(IPC_CHANNELS.CATEGORIES_DEACTIVATE, (_e, id) => deactivateCategoryService(id));
    ipcMain.handle(IPC_CHANNELS.CATEGORIES_DESTROY, (_e, id) => destroyCategoryService(id));
}
