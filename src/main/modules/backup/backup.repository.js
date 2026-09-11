export function insertBackupLog(db, data) {
    const result = db
        .prepare(`INSERT INTO backup_logs (file_path, type, size_bytes, status)
       VALUES (?, ?, ?, ?)`)
        .run(data.filePath, data.type, data.sizeBytes, data.status ?? 'ok');
    return Number(result.lastInsertRowid);
}
export function listBackupLogs(db) {
    return db
        .prepare(`SELECT id, file_path, type, size_bytes, created_at, status
       FROM backup_logs ORDER BY created_at DESC`)
        .all();
}
export function getBackupLogById(db, id) {
    return db
        .prepare(`SELECT id, file_path, type, size_bytes, created_at, status FROM backup_logs WHERE id = ?`)
        .get(id);
}
export function deleteBackupLog(db, id) {
    db.prepare('DELETE FROM backup_logs WHERE id = ?').run(id);
}
export function hasAutoBackupToday(db) {
    const row = db
        .prepare(`SELECT COUNT(*) AS c FROM backup_logs
       WHERE type = 'auto' AND date(created_at) = date('now') AND status = 'ok'`)
        .get();
    return row.c > 0;
}
export function listOldAutoBackups(db, keepDays) {
    return db
        .prepare(`SELECT id, file_path, type, size_bytes, created_at, status
       FROM backup_logs
       WHERE type = 'auto' AND date(created_at) < date('now', ?)
       ORDER BY created_at ASC`)
        .all(`-${keepDays} days`);
}
