import type Database from 'better-sqlite3';
import type { CategoryListFilters } from '@shared/types/catalog';
export interface CategoryRow {
    id: number;
    parent_id: number | null;
    parent_name: string | null;
    name: string;
    description: string | null;
    is_active: number;
    sort_order: number;
    created_at: string;
    updated_at: string | null;
    product_count: number;
    subcategory_count: number;
}
export declare function listCategories(db: Database.Database, filters: CategoryListFilters): CategoryRow[];
export declare function getCategoryById(db: Database.Database, id: number): CategoryRow | undefined;
export declare function getCategoryByNameAndParent(db: Database.Database, name: string, parentId: number | null, excludeId?: number): {
    id: number;
} | undefined;
export declare function insertCategory(db: Database.Database, data: {
    parentId: number | null;
    name: string;
    description: string | null;
    sortOrder: number;
    isActive: number;
}): number;
export declare function updateCategory(db: Database.Database, id: number, data: {
    parentId: number | null;
    name: string;
    description: string | null;
    sortOrder: number;
    isActive: number;
}): void;
export declare function softDeleteCategory(db: Database.Database, id: number): void;
export declare function countProductsInCategory(db: Database.Database, categoryId: number): number;
export declare function countAllProductsInCategory(db: Database.Database, categoryId: number): number;
export declare function countAllSubcategories(db: Database.Database, parentId: number): number;
export declare function hardDeleteCategory(db: Database.Database, id: number): boolean;
export declare function countActiveSubcategories(db: Database.Database, parentId: number): number;
export declare function listParentCategories(db: Database.Database): CategoryRow[];
