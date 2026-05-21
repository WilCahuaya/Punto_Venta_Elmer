import { app } from 'electron'
import { join } from 'path'

export function getDbPath(): string {
  return join(app.getPath('userData'), 'pos.db')
}

export function getBackupsDir(): string {
  return join(app.getPath('userData'), 'backups')
}

export function getImagesDir(): string {
  return join(app.getPath('userData'), 'images')
}

export function resolveImagePath(relativePath: string): string {
  return join(app.getPath('userData'), relativePath)
}

export function getMigrationsDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'database', 'migrations')
  }
  return join(app.getAppPath(), 'database', 'migrations')
}
