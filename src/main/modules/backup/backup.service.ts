import { app, dialog } from 'electron'
import { copyFileSync, existsSync, mkdirSync, statSync, unlinkSync } from 'fs'
import { basename, join } from 'path'
import type { ApiResult } from '@shared/types/api'
import type { BackupEntry, BackupStatus, BackupType } from '@shared/types/backup'
import { closeDatabase, getDatabase } from '../../database/connection'
import { getBackupsDir, getDbPath } from '../../utils/paths'
import {
  deleteBackupLog,
  getBackupLogById,
  hasAutoBackupToday,
  insertBackupLog,
  listBackupLogs,
  listOldAutoBackups,
  type BackupLogRow
} from './backup.repository'

function getSetting(key: string, fallback: string): string {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? fallback
}

function mapRow(row: BackupLogRow): BackupEntry {
  return {
    id: row.id,
    fileName: basename(row.file_path),
    filePath: row.file_path,
    type: row.type as BackupType,
    sizeBytes: row.size_bytes ?? 0,
    createdAt: row.created_at,
    status: row.status
  }
}

function ensureBackupsDir(): string {
  const dir = getBackupsDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function buildBackupFileName(type: BackupType): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  return `pos-${type}-${stamp}.db`
}

async function copyDatabaseTo(destPath: string): Promise<void> {
  const db = getDatabase()
  await db.backup(destPath)
}

export async function createBackupService(type: BackupType): Promise<ApiResult<BackupEntry>> {
  try {
    const dir = ensureBackupsDir()
    const fileName = buildBackupFileName(type)
    const destPath = join(dir, fileName)

    await copyDatabaseTo(destPath)
    const sizeBytes = statSync(destPath).size

    const db = getDatabase()
    const id = insertBackupLog(db, {
      filePath: destPath,
      type,
      sizeBytes
    })

    const row = getBackupLogById(db, id)!
    return { ok: true, data: mapRow(row) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al crear backup' }
  }
}

function rotateOldBackups(): void {
  const retention = Number.parseInt(getSetting('backup_retention_days', '30'), 10) || 30
  const db = getDatabase()
  const old = listOldAutoBackups(db, retention)

  for (const row of old) {
    if (existsSync(row.file_path)) {
      try {
        unlinkSync(row.file_path)
      } catch {
        // ignorar archivos bloqueados
      }
    }
    deleteBackupLog(db, row.id)
  }
}

export async function runAutoBackupIfNeeded(): Promise<void> {
  if (getSetting('backup_auto_enabled', 'true') !== 'true') return

  const db = getDatabase()
  if (hasAutoBackupToday(db)) return

  const result = await createBackupService('auto')
  if (result.ok) rotateOldBackups()
}

export function listBackupsService(): ApiResult<BackupEntry[]> {
  const db = getDatabase()
  const rows = listBackupLogs(db).filter((r) => existsSync(r.file_path))
  return { ok: true, data: rows.map(mapRow) }
}

export function getBackupStatusService(): ApiResult<BackupStatus> {
  const listResult = listBackupsService()
  if (!listResult.ok) return listResult

  const autoEnabled = getSetting('backup_auto_enabled', 'true') === 'true'
  const retentionDays = Number.parseInt(getSetting('backup_retention_days', '30'), 10) || 30
  const lastAuto =
    listResult.data.find((b) => b.type === 'auto' && b.status === 'ok') ?? null

  return {
    ok: true,
    data: {
      backupsDir: getBackupsDir(),
      autoEnabled,
      retentionDays,
      lastAutoBackup: lastAuto,
      totalCount: listResult.data.length
    }
  }
}

export async function restoreBackupService(id: number): Promise<ApiResult<null>> {
  const db = getDatabase()
  const row = getBackupLogById(db, id)
  if (!row || !existsSync(row.file_path)) {
    return { ok: false, error: 'Backup no encontrado' }
  }

  try {
    closeDatabase()

    const dbPath = getDbPath()
    copyFileSync(row.file_path, dbPath)

    for (const suffix of ['-wal', '-shm']) {
      const extra = dbPath + suffix
      if (existsSync(extra)) unlinkSync(extra)
    }

    getDatabase()

    app.relaunch()
    app.exit()

    return { ok: true, data: null }
  } catch (e) {
    getDatabase()
    return { ok: false, error: e instanceof Error ? e.message : 'Error al restaurar backup' }
  }
}

export async function exportBackupService(id: number): Promise<ApiResult<string>> {
  const db = getDatabase()
  const row = getBackupLogById(db, id)
  if (!row || !existsSync(row.file_path)) {
    return { ok: false, error: 'Backup no encontrado' }
  }

  const result = await dialog.showSaveDialog({
    defaultPath: basename(row.file_path),
    filters: [{ name: 'Base de datos SQLite', extensions: ['db'] }]
  })

  if (result.canceled || !result.filePath) {
    return { ok: false, error: 'Exportación cancelada' }
  }

  try {
    copyFileSync(row.file_path, result.filePath)
    return { ok: true, data: result.filePath }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al exportar' }
  }
}

export async function importBackupService(): Promise<ApiResult<BackupEntry>> {
  const result = await dialog.showOpenDialog({
    title: 'Importar backup',
    properties: ['openFile'],
    filters: [{ name: 'Base de datos SQLite', extensions: ['db'] }]
  })

  if (result.canceled || !result.filePaths[0]) {
    return { ok: false, error: 'Importación cancelada' }
  }

  try {
    const dir = ensureBackupsDir()
    const fileName = buildBackupFileName('manual')
    const destPath = join(dir, fileName)
    copyFileSync(result.filePaths[0], destPath)
    const sizeBytes = statSync(destPath).size

    const db = getDatabase()
    const id = insertBackupLog(db, {
      filePath: destPath,
      type: 'manual',
      sizeBytes
    })

    const log = getBackupLogById(db, id)!
    return { ok: true, data: mapRow(log) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al importar' }
  }
}

export function deleteBackupService(id: number): ApiResult<null> {
  const db = getDatabase()
  const row = getBackupLogById(db, id)
  if (!row) return { ok: false, error: 'Backup no encontrado' }

  if (existsSync(row.file_path)) {
    try {
      unlinkSync(row.file_path)
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'No se pudo eliminar el archivo' }
    }
  }

  deleteBackupLog(db, id)
  return { ok: true, data: null }
}
