import type Database from 'better-sqlite3';
export declare function generateBarcodeForProduct(db: Database.Database, categoryId: number | null, productName: string): string;
export declare function generateCandidateBarcode(db: Database.Database): string;
export declare function generateProductCode(db: Database.Database): string;
