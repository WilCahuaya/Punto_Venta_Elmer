import { BrowserWindow, shell, app } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
export function createMainWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 640,
        show: true,
        autoHideMenuBar: true,
        title: 'Punto de Venta',
        icon: join(app.getAppPath(), 'resources', 'icon.ico'),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });
    const showWindow = () => {
        if (!win.isDestroyed() && !win.isVisible())
            win.show();
    };
    win.on('ready-to-show', showWindow);
    win.webContents.on('did-finish-load', showWindow);
    win.webContents.on('did-fail-load', (_event, code, desc) => {
        showWindow();
        console.error('No se pudo cargar la interfaz:', code, desc);
    });
    setTimeout(showWindow, 2500);
    win.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: 'deny' };
    });
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        void win.loadURL(process.env['ELECTRON_RENDERER_URL']);
    }
    else {
        void win.loadFile(join(__dirname, '../renderer/index.html'));
    }
    return win;
}
