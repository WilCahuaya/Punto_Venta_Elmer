import { roundMoney } from './currency'

export const DOZEN_UNITS = 12
/** El precio de docena aplica desde 3 unidades (no hace falta comprar 12). */
export const DOZEN_MIN_UNITS = 3

export type PackPriceChoice = 'retail' | 'wholesale' | 'dozen' | 'plancha' | 'cajon' | 'manual'

export interface ProductPackFields {
  priceDozen?: number | null
  planchaQty?: number | null
  pricePlancha?: number | null
  cajonQty?: number | null
  priceCajon?: number | null
}

export function optionalPositive(value?: number | null): number | null {
  return value != null && value > 0 ? value : null
}

export function isDozenEnabled(p: ProductPackFields): boolean {
  return optionalPositive(p.priceDozen) != null
}

export function isPlanchaEnabled(p: ProductPackFields): boolean {
  return optionalPositive(p.planchaQty) != null && optionalPositive(p.pricePlancha) != null
}

export function isCajonEnabled(p: ProductPackFields): boolean {
  return optionalPositive(p.cajonQty) != null && optionalPositive(p.priceCajon) != null
}

export function unitsPerPackForChoice(
  choice: PackPriceChoice,
  p: ProductPackFields
): number {
  if (choice === 'dozen') return 1
  if (choice === 'plancha') return optionalPositive(p.planchaQty) ?? 0
  if (choice === 'cajon') return optionalPositive(p.cajonQty) ?? 0
  return 1
}

export function maxPacksForStock(stock: number, unitsPerPack: number): number {
  if (unitsPerPack <= 0) return 0
  return Math.floor(stock / unitsPerPack)
}

export function minQtyForPackChoice(choice: PackPriceChoice): number {
  return choice === 'dozen' ? DOZEN_MIN_UNITS : 1
}

export function isDozenPriceLabel(priceLabel: string): boolean {
  return priceLabel.startsWith('Docena')
}

export function minQtyForCartLine(priceLabel: string): number {
  return isDozenPriceLabel(priceLabel) ? DOZEN_MIN_UNITS : 1
}

/** Precio del empaque = precio por unidad × unidades del paquete. */
export function packSalePrice(unitPrice: number, unitsPerPack: number): number {
  if (unitPrice <= 0 || unitsPerPack <= 0) return 0
  return roundMoney(unitPrice * unitsPerPack)
}

/** Unidades de inventario correspondientes a una cantidad comercial (empaques o unidades). */
export function stockUnitsForCommercialQty(
  commercialQty: number,
  lineQty: number,
  stockQuantity: number
): number {
  if (lineQty <= 0) return commercialQty
  return (commercialQty * stockQuantity) / lineQty
}
