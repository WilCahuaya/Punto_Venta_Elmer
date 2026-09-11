import type Database from 'better-sqlite3';
export declare function isSystemServiceProductCode(code: string | null | undefined): boolean;
export declare function isSystemServiceProductId(db: Database.Database, productId: number): boolean;
/** Crea el producto interno si no existe; no aparece en catálogo ni POS. */
export declare function ensureSystemServiceProduct(db: Database.Database): number;
export declare function systemServiceExcludeSql(alias?: string): string;
