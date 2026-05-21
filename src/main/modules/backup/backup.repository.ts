import type Database from 'better-sqlite3'
import type { BackupType } from '@shared/types/backup'

export interface BackupLogRow {
  id: number
  file_path: string
  type: string
  size_bytes: number | null
  created_at: string
  status: string
}

export function insertBackupLog(
  db: Database.Database,
  data: { filePath: string; type: BackupType; sizeBytes: number; status?: string }
): number {
  const result = db
    .prepare(
      `INSERT INTO backup_logs (file_path, type, size_bytes, status)
       VALUES (?, ?, ?, ?)`
    )
    .run(data.filePath, data.type, data.sizeBytes, data.status ?? 'ok')
  return Number(result.lastInsertRowid)
}

export function listBackupLogs(db: Database.Database): BackupLogRow[] {
  return db
    .prepare(
      `SELECT id, file_path, type, size_bytes, created_at, status
       FROM backup_logs ORDER BY created_at DESC`
    )
    .all() as BackupLogRow[]
}

export function getBackupLogById(db: Database.Database, id: number): BackupLogRow | undefined {
  return db
    .prepare(
      `SELECT id, file_path, type, size_bytes, created_at, status FROM backup_logs WHERE id = ?`
    )
    .get(id) as BackupLogRow | undefined
}

export function deleteBackupLog(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM backup_logs WHERE id = ?').run(id)
}

export function hasAutoBackupToday(db: Database.Database): boolean {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM backup_logs
       WHERE type = 'auto' AND date(created_at) = date('now') AND status = 'ok'`
    )
    .get() as { c: number }
  return row.c > 0
}

export function listOldAutoBackups(db: Database.Database, keepDays: number): BackupLogRow[] {
  return db
    .prepare(
      `SELECT id, file_path, type, size_bytes, created_at, status
       FROM backup_logs
       WHERE type = 'auto' AND date(created_at) < date('now', ?)
       ORDER BY created_at ASC`
    )
    .all(`-${keepDays} days`) as BackupLogRow[]
}
