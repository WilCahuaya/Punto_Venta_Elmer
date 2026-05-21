import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import { getDashboardStatsService } from './dashboard.service'

export function registerDashboardIpc(): void {
  ipcMain.handle(IPC_CHANNELS.DASHBOARD_STATS, () => getDashboardStatsService())
}
