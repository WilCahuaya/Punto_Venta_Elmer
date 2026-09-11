import { app, dialog } from 'electron';
import { copyFileSync, existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { basename, join } from 'path';
import Database from 'better-sqlite3';
import { closeDatabase, getDatabase } from '../../database/connection';
import { runMigrations } from '../../database/migrate';
import { seedDatabase } from '../../database/seed';
import { getBackupsDir, getDbPath } from '../../utils/paths';
import { deleteBackupLog, getBackupLogById, hasAutoBackupToday, insertBackupLog, listBackupLogs, listOldAutoBackups } from './backup.repository';
function getSetting(key, fallback) {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row?.value ?? fallback;
}
function mapRow(row) {
    return {
        id: row.id,
        fileName: basename(row.file_path),
        filePath: row.file_path,
        type: row.type,
        sizeBytes: row.size_bytes ?? 0,
        createdAt: row.created_at,
        status: row.status
    };
}
function ensureBackupsDir() {
    const dir = getBackupsDir();
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
    return dir;
}
function buildBackupFileName(type) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    return `pos-${type}-${stamp}.db`;
}
async function copyDatabaseTo(destPath) {
    const db = getDatabase();
    await db.backup(destPath);
}
export async function createBackupService(type) {
    try {
        const dir = ensureBackupsDir();
        const fileName = buildBackupFileName(type);
        const destPath = join(dir, fileName);
        await copyDatabaseTo(destPath);
        const sizeBytes = statSync(destPath).size;
        const db = getDatabase();
        const id = insertBackupLog(db, {
            filePath: destPath,
            type,
            sizeBytes
        });
        const row = getBackupLogById(db, id);
        return { ok: true, data: mapRow(row) };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error al crear backup' };
    }
}
function rotateOldBackups() {
    const retention = Number.parseInt(getSetting('backup_retention_days', '30'), 10) || 30;
    const db = getDatabase();
    const old = listOldAutoBackups(db, retention);
    for (const row of old) {
        if (existsSync(row.file_path)) {
            try {
                unlinkSync(row.file_path);
            }
            catch {
                // ignorar archivos bloqueados
            }
        }
        deleteBackupLog(db, row.id);
    }
}
export async function runAutoBackupIfNeeded() {
    if (getSetting('backup_auto_enabled', 'true') !== 'true')
        return;
    const db = getDatabase();
    if (hasAutoBackupToday(db))
        return;
    const result = await createBackupService('auto');
    if (result.ok)
        rotateOldBackups();
}
export function listBackupsService() {
    const db = getDatabase();
    const rows = listBackupLogs(db).filter((r) => existsSync(r.file_path));
    return { ok: true, data: rows.map(mapRow) };
}
export function getBackupStatusService() {
    const listResult = listBackupsService();
    if (!listResult.ok)
        return listResult;
    const autoEnabled = getSetting('backup_auto_enabled', 'true') === 'true';
    const retentionDays = Number.parseInt(getSetting('backup_retention_days', '30'), 10) || 30;
    const lastAuto = listResult.data.find((b) => b.type === 'auto' && b.status === 'ok') ?? null;
    return {
        ok: true,
        data: {
            backupsDir: getBackupsDir(),
            autoEnabled,
            retentionDays,
            lastAutoBackup: lastAuto,
            totalCount: listResult.data.length
        }
    };
}
function migrateStandaloneFile(filePath) {
    const db = new Database(filePath);
    try {
        db.pragma('journal_mode = DELETE');
        db.pragma('foreign_keys = ON');
        runMigrations(db);
        seedDatabase(db);
    }
    finally {
        db.close();
    }
}
export async function restoreBackupService(id) {
    const db = getDatabase();
    const row = getBackupLogById(db, id);
    if (!row || !existsSync(row.file_path)) {
        return { ok: false, error: 'Backup no encontrado' };
    }
    const dbPath = getDbPath();
    const incomingPath = `${dbPath}.incoming`;
    try {
        copyFileSync(row.file_path, incomingPath);
        migrateStandaloneFile(incomingPath);
    }
    catch (e) {
        if (existsSync(incomingPath)) {
            try {
                unlinkSync(incomingPath);
            }
            catch {
                /* ignore */
            }
        }
        return {
            ok: false,
            error: e instanceof Error
                ? `No se pudo aplicar el backup (esquema incompatible): ${e.message}`
                : 'No se pudo aplicar el backup'
        };
    }
    try {
        closeDatabase();
        copyFileSync(incomingPath, dbPath);
        unlinkSync(incomingPath);
        for (const extra of [`${dbPath}-wal`, `${dbPath}-shm`]) {
            if (existsSync(extra))
                unlinkSync(extra);
        }
        getDatabase();
        app.relaunch();
        app.exit();
        return { ok: true, data: null };
    }
    catch (e) {
        getDatabase();
        return { ok: false, error: e instanceof Error ? e.message : 'Error al restaurar backup' };
    }
}
export async function exportBackupService(id) {
    const db = getDatabase();
    const row = getBackupLogById(db, id);
    if (!row || !existsSync(row.file_path)) {
        return { ok: false, error: 'Backup no encontrado' };
    }
    const result = await dialog.showSaveDialog({
        defaultPath: basename(row.file_path),
        filters: [{ name: 'Base de datos SQLite', extensions: ['db'] }]
    });
    if (result.canceled || !result.filePath) {
        return { ok: false, error: 'Exportación cancelada' };
    }
    try {
        copyFileSync(row.file_path, result.filePath);
        return { ok: true, data: result.filePath };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error al exportar' };
    }
}
export async function importBackupService() {
    const result = await dialog.showOpenDialog({
        title: 'Importar backup',
        properties: ['openFile'],
        filters: [{ name: 'Base de datos SQLite', extensions: ['db'] }]
    });
    if (result.canceled || !result.filePaths[0]) {
        return { ok: false, error: 'Importación cancelada' };
    }
    try {
        const dir = ensureBackupsDir();
        const fileName = buildBackupFileName('manual');
        const destPath = join(dir, fileName);
        copyFileSync(result.filePaths[0], destPath);
        const sizeBytes = statSync(destPath).size;
        const db = getDatabase();
        const id = insertBackupLog(db, {
            filePath: destPath,
            type: 'manual',
            sizeBytes
        });
        const log = getBackupLogById(db, id);
        return { ok: true, data: mapRow(log) };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error al importar' };
    }
}
export function deleteBackupService(id) {
    const db = getDatabase();
    const row = getBackupLogById(db, id);
    if (!row)
        return { ok: false, error: 'Backup no encontrado' };
    if (existsSync(row.file_path)) {
        try {
            unlinkSync(row.file_path);
        }
        catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : 'No se pudo eliminar el archivo' };
        }
    }
    deleteBackupLog(db, id);
    return { ok: true, data: null };
}
