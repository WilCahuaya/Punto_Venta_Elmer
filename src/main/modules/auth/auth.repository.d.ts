import type Database from 'better-sqlite3';
export interface UserRow {
    id: number;
    username: string;
    password_hash: string;
    display_name: string | null;
    is_active: number;
}
export declare function findUserByUsername(db: Database.Database, username: string): UserRow | undefined;
export declare function findUserById(db: Database.Database, id: number): UserRow | undefined;
