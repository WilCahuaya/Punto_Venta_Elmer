import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import type { CategoryInput, CategoryListFilters } from '@shared/types/catalog'
import {
  createCategoryService,
  deleteCategoryService,
  getCategoryService,
  listCategoriesService,
  updateCategoryService
} from './categories.service'

export function registerCategoriesIpc(): void {
  ipcMain.handle(IPC_CHANNELS.CATEGORIES_LIST, (_e, filters?: CategoryListFilters) =>
    listCategoriesService(filters ?? {})
  )
  ipcMain.handle(IPC_CHANNELS.CATEGORIES_GET, (_e, id: number) => getCategoryService(id))
  ipcMain.handle(IPC_CHANNELS.CATEGORIES_CREATE, (_e, input: CategoryInput) =>
    createCategoryService(input)
  )
  ipcMain.handle(IPC_CHANNELS.CATEGORIES_UPDATE, (_e, id: number, input: CategoryInput) =>
    updateCategoryService(id, input)
  )
  ipcMain.handle(IPC_CHANNELS.CATEGORIES_DELETE, (_e, id: number) => deleteCategoryService(id))
}
