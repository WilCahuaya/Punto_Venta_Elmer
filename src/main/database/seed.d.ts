import type Database from 'better-sqlite3';
export declare function seedDatabase(database: Database.Database): void;
export declare function getDefaultCredentials(): {
    username: string;
    password: string;
};
