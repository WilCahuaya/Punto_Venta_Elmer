import type { Category } from '@shared/types/catalog';
export declare function buildCategorySelectOptions(categories: Category[]): {
    value: string;
    label: string;
}[];
export declare function buildParentCategoryOptions(categories: Category[]): {
    value: string;
    label: string;
}[];
