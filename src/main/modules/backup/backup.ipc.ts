import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import {
  createBackupService,
  deleteBackupService,
  exportBackupService,
  getBackupStatusService,
  importBackupService,
  listBackupsService,
  restoreBackupService
} from './backup.service'

export function registerBackupIpc(): void {
  ipcMain.handle(IPC_CHANNELS.BACKUP_LIST, () => listBackupsService())
  ipcMain.handle(IPC_CHANNELS.BACKUP_STATUS, () => getBackupStatusService())
  ipcMain.handle(IPC_CHANNELS.BACKUP_CREATE, () => createBackupService('manual'))
  ipcMain.handle(IPC_CHANNELS.BACKUP_RESTORE, (_e, id: number) => restoreBackupService(id))
  ipcMain.handle(IPC_CHANNELS.BACKUP_EXPORT, (_e, id: number) => exportBackupService(id))
  ipcMain.handle(IPC_CHANNELS.BACKUP_IMPORT, () => importBackupService())
  ipcMain.handle(IPC_CHANNELS.BACKUP_DELETE, (_e, id: number) => deleteBackupService(id))
}
