import type { ApiResult } from '@shared/types/api';
import type { Category, CategoryInput, CategoryListFilters } from '@shared/types/catalog';
export declare function listCategoriesService(filters?: CategoryListFilters): ApiResult<Category[]>;
export declare function getCategoryService(id: number): ApiResult<Category>;
export declare function createCategoryService(input: CategoryInput): ApiResult<Category>;
export declare function updateCategoryService(id: number, input: CategoryInput): ApiResult<Category>;
/** Desactiva la categoría (paso previo a eliminarla de la base de datos). */
export declare function deactivateCategoryService(id: number): ApiResult<null>;
/** Elimina la categoría de la base de datos (solo si ya está inactiva). */
export declare function destroyCategoryService(id: number): ApiResult<null>;
