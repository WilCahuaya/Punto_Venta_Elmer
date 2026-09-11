import type Database from 'better-sqlite3';
import type { BackupType } from '@shared/types/backup';
export interface BackupLogRow {
    id: number;
    file_path: string;
    type: string;
    size_bytes: number | null;
    created_at: string;
    status: string;
}
export declare function insertBackupLog(db: Database.Database, data: {
    filePath: string;
    type: BackupType;
    sizeBytes: number;
    status?: string;
}): number;
export declare function listBackupLogs(db: Database.Database): BackupLogRow[];
export declare function getBackupLogById(db: Database.Database, id: number): BackupLogRow | undefined;
export declare function deleteBackupLog(db: Database.Database, id: number): void;
export declare function hasAutoBackupToday(db: Database.Database): boolean;
export declare function listOldAutoBackups(db: Database.Database, keepDays: number): BackupLogRow[];
