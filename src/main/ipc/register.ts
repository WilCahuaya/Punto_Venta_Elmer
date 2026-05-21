import { registerAuthIpc } from '../modules/auth/auth.ipc'
import { registerDashboardIpc } from '../modules/dashboard/dashboard.ipc'
import { registerCashIpc } from '../modules/cash/cash.ipc'
import { registerSalesIpc } from '../modules/sales/sales.ipc'
import { registerCategoriesIpc } from '../modules/categories/categories.ipc'
import { registerProductsIpc } from '../modules/products/products.ipc'
import { registerSettingsIpc } from '../modules/settings/settings.ipc'

export function registerIpcHandlers(): void {
  registerAuthIpc()
  registerSettingsIpc()
  registerCategoriesIpc()
  registerProductsIpc()
  registerCashIpc()
  registerSalesIpc()
  registerDashboardIpc()
}
