import type Database from 'better-sqlite3';
export interface LowStockRow {
    id: number;
    name: string;
    barcode: string | null;
    stock: number;
    stock_min: number;
    category_name: string | null;
}
export declare function getLowStockProducts(db: Database.Database, limit?: number): LowStockRow[];
