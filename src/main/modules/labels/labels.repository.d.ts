import type Database from 'better-sqlite3';
import type { LabelPrintItem, LabelPrintMode } from '@shared/types/labels';
export declare function barcodeExists(db: Database.Database, barcode: string): boolean;
export interface LabelJobInsert {
    mode: LabelPrintMode;
    labelCount: number;
    itemCount: number;
    sheets?: number | null;
    a4PresetId?: string | null;
    a4WidthMm?: number | null;
    a4HeightMm?: number | null;
    a4PrinterName?: string | null;
    items: LabelPrintItem[];
}
export declare function insertLabelPrintJob(db: Database.Database, job: LabelJobInsert): number;
interface JobRow {
    id: number;
    printed_at: string;
    mode: LabelPrintMode;
    label_count: number;
    item_count: number;
    sheets: number | null;
    a4_preset_id: string | null;
    a4_width_mm: number | null;
    a4_height_mm: number | null;
    a4_printer_name: string | null;
}
interface ItemRow {
    id: number;
    name: string;
    barcode: string;
    price: string | number | null;
    copies: number;
    preset_id: string | null;
    width_mm: number | null;
    height_mm: number | null;
}
export declare function listLabelPrintJobs(db: Database.Database, limit?: number): JobRow[];
export declare function listPreviewNamesForJobs(db: Database.Database, jobIds: number[]): Map<number, string[]>;
export declare function listItemSizeSummaryForJobs(db: Database.Database, jobIds: number[]): Map<number, {
    mixed: boolean;
}>;
export declare function getLabelPrintJob(db: Database.Database, id: number): {
    job: JobRow;
    items: ItemRow[];
} | null;
export declare function deleteLabelPrintJob(db: Database.Database, id: number): boolean;
export declare function clearLabelPrintHistory(db: Database.Database): number;
export declare function mapJobItemPrice(price: string | number | null): number | null;
export {};
