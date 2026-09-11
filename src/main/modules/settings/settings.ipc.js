import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { getLogoUrlService, getSettings, listPrintersService, pickCompanyLogoService, removeCompanyLogoService, setSetting, testPrintTicketService, testPrintLabelService, updateSettings } from './settings.service';
export function registerSettingsIpc() {
    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => getSettings());
    ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_e, key, value) => setSetting(key, value));
    ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, (_e, input) => updateSettings(input));
    ipcMain.handle(IPC_CHANNELS.SETTINGS_LIST_PRINTERS, () => listPrintersService());
    ipcMain.handle(IPC_CHANNELS.SETTINGS_PICK_LOGO, () => pickCompanyLogoService());
    ipcMain.handle(IPC_CHANNELS.SETTINGS_REMOVE_LOGO, () => removeCompanyLogoService());
    ipcMain.handle(IPC_CHANNELS.SETTINGS_LOGO_URL, (_e, path) => getLogoUrlService(path));
    ipcMain.handle(IPC_CHANNELS.SETTINGS_TEST_PRINT, () => testPrintTicketService());
    ipcMain.handle(IPC_CHANNELS.SETTINGS_TEST_LABEL_PRINT, () => testPrintLabelService());
}
