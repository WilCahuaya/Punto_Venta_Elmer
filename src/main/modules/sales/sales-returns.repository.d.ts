import type Database from 'better-sqlite3';
export interface SaleItemWithReturnsRow {
    id: number;
    sale_id: number;
    product_id: number;
    product_name: string;
    barcode: string | null;
    quantity: number;
    returned_quantity: number;
    unit_price: string;
    line_total: string;
    cost_price: string;
    stock_quantity: number;
}
export declare function getSaleItemsWithReturns(db: Database.Database, saleId: number): SaleItemWithReturnsRow[];
export declare function getReturnedTotalForSale(db: Database.Database, saleId: number): string;
export declare function insertSaleReturn(db: Database.Database, data: {
    saleId: number;
    reason: string;
    createdBy: number | null;
}): number;
export declare function insertSaleReturnItem(db: Database.Database, data: {
    returnId: number;
    saleItemId: number;
    productId: number;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
}): void;
export declare function addReturnedQuantity(db: Database.Database, saleItemId: number, quantity: number): void;
