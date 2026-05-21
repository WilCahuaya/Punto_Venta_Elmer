import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { registerMediaScheme, setupMediaProtocolHandler } from './app/protocol'
import { createMainWindow } from './app/window'
import { closeDatabase, getDatabase } from './database/connection'
import { runMigrations } from './database/migrate'
import { seedDatabase } from './database/seed'
import { registerIpcHandlers } from './ipc/register'

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
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
