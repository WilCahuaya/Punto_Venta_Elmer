import Database from 'better-sqlite3';
import { getDbPath } from '../utils/paths';
let db = null;
export function getDatabase() {
    if (!db) {
        db = new Database(getDbPath());
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}
export function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}
