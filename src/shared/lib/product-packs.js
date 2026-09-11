import { roundMoney } from './currency';
export const DOZEN_UNITS = 12;
export function optionalPositive(value) {
    return value != null && value > 0 ? value : null;
}
export function isDozenEnabled(p) {
    return optionalPositive(p.priceDozen) != null;
}
export function isPlanchaEnabled(p) {
    return optionalPositive(p.planchaQty) != null && optionalPositive(p.pricePlancha) != null;
}
export function isCajonEnabled(p) {
    return optionalPositive(p.cajonQty) != null && optionalPositive(p.priceCajon) != null;
}
export function unitsPerPackForChoice(choice, p) {
    if (choice === 'dozen')
        return DOZEN_UNITS;
    if (choice === 'plancha')
        return optionalPositive(p.planchaQty) ?? 0;
    if (choice === 'cajon')
        return optionalPositive(p.cajonQty) ?? 0;
    return 1;
}
export function maxPacksForStock(stock, unitsPerPack) {
    if (unitsPerPack <= 0)
        return 0;
    return Math.floor(stock / unitsPerPack);
}
/** Precio del empaque = precio por unidad × unidades del paquete. */
export function packSalePrice(unitPrice, unitsPerPack) {
    if (unitPrice <= 0 || unitsPerPack <= 0)
        return 0;
    return roundMoney(unitPrice * unitsPerPack);
}
/** Unidades de inventario correspondientes a una cantidad comercial (empaques o unidades). */
export function stockUnitsForCommercialQty(commercialQty, lineQty, stockQuantity) {
    if (lineQty <= 0)
        return commercialQty;
    return (commercialQty * stockQuantity) / lineQty;
}
