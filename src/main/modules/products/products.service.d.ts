import type { ApiResult } from '@shared/types/api';
import type { AdjustStockInput, Product, ProductInput, ProductListFilters } from '@shared/types/catalog';
export declare function listProductsService(filters?: ProductListFilters): ApiResult<Product[]>;
export declare function getProductService(id: number): ApiResult<Product>;
export declare function lookupProductByBarcodeService(barcode: string): ApiResult<Product>;
export declare function adjustStockService(input: AdjustStockInput): ApiResult<Product>;
export declare function createProductService(input: ProductInput): ApiResult<Product>;
export declare function updateProductService(id: number, input: ProductInput): ApiResult<Product>;
/** Desactiva el producto (paso previo a eliminarlo de la base de datos). */
export declare function deactivateProductService(id: number): ApiResult<null>;
/** Elimina el producto de la base de datos (solo si ya está inactivo). */
export declare function destroyProductService(id: number): ApiResult<null>;
export declare function pickProductImageService(): Promise<ApiResult<string | null>>;
export declare function getProductImageUrlService(relativePath: string | null): ApiResult<string | null>;
export declare function searchProductsPosService(query: string): ApiResult<Product[]>;
export declare function getSystemServiceProductService(): ApiResult<{
    productId: number;
}>;
