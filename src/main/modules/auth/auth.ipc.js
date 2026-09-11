import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { getSession, login, logout } from './auth.service';
export function registerAuthIpc() {
    ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, (_e, payload) => login(payload));
    ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, () => logout());
    ipcMain.handle(IPC_CHANNELS.AUTH_GET_SESSION, () => getSession());
}
