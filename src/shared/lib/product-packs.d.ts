export declare const DOZEN_UNITS = 12;
export type PackPriceChoice = 'retail' | 'wholesale' | 'dozen' | 'plancha' | 'cajon' | 'manual';
export interface ProductPackFields {
    priceDozen?: number | null;
    planchaQty?: number | null;
    pricePlancha?: number | null;
    cajonQty?: number | null;
    priceCajon?: number | null;
}
export declare function optionalPositive(value?: number | null): number | null;
export declare function isDozenEnabled(p: ProductPackFields): boolean;
export declare function isPlanchaEnabled(p: ProductPackFields): boolean;
export declare function isCajonEnabled(p: ProductPackFields): boolean;
export declare function unitsPerPackForChoice(choice: PackPriceChoice, p: ProductPackFields): number;
export declare function maxPacksForStock(stock: number, unitsPerPack: number): number;
/** Precio del empaque = precio por unidad × unidades del paquete. */
export declare function packSalePrice(unitPrice: number, unitsPerPack: number): number;
/** Unidades de inventario correspondientes a una cantidad comercial (empaques o unidades). */
export declare function stockUnitsForCommercialQty(commercialQty: number, lineQty: number, stockQuantity: number): number;
