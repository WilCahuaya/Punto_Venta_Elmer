import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc'
import type { LoginPayload } from '@shared/types/api'
import { getSession, login, logout } from './auth.service'

export function registerAuthIpc(): void {
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, (_e, payload: LoginPayload) => login(payload))
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, () => logout())
  ipcMain.handle(IPC_CHANNELS.AUTH_GET_SESSION, () => getSession())
}
