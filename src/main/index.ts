import { app, BrowserWindow, dialog } from 'electron'
import { writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { registerMediaScheme, setupMediaProtocolHandler } from './app/protocol'
import { createMainWindow } from './app/window'
import { closeDatabase, getDatabase } from './database/connection'
import { runMigrations } from './database/migrate'
import { seedDatabase } from './database/seed'
import { runAutoBackupIfNeeded } from './modules/backup/backup.service'
import { registerIpcHandlers } from './ipc/register'

function writeCrashLog(text: string): void {
  const files = [
    join(dirname(process.execPath), 'startup-error.log'),
    join(app.getPath('userData'), 'startup-error.log')
  ]
  for (const file of files) {
    try {
      writeFileSync(file, text, 'utf8')
    } catch {
      /* ignore */
    }
  }
}

function reportStartupError(error: unknown): void {
  const text = error instanceof Error ? `${error.message}\n\n${error.stack ?? ''}` : String(error)
  writeCrashLog(text)
  try {
    dialog.showErrorBox('Punto de Venta no pudo iniciar', text.slice(0, 1800))
  } catch {
    /* ignore */
  }
}

process.on('uncaughtException', reportStartupError)
process.on('unhandledRejection', (reason) => reportStartupError(reason))

app.disableHardwareAcceleration()
registerMediaScheme()

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.puntoventa.app')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const db = getDatabase()
  runMigrations(db)
  seedDatabase(db)
  setupMediaProtocolHandler()
  registerIpcHandlers()
  void runAutoBackupIfNeeded().catch(reportStartupError)
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
}).catch(reportStartupError)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
