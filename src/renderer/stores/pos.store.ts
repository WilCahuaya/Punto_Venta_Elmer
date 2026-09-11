import { create } from 'zustand'
import type { CartLine } from '@shared/types/sales'
import { minQtyForCartLine } from '@shared/lib/product-packs'

interface PosState {
  lines: CartLine[]
  discount: number
  addProduct: (
    product: {
      id: number
      name: string
      barcode: string | null
      stock: number
      costPrice: number
    },
    quantity: number,
    unitPrice: number,
    priceLabel: string,
    unitsPerPack?: number
  ) => void
  addServiceLine: (
    productId: number,
    description: string,
    unitPrice: number
  ) => void
  updateQuantity: (key: string, quantity: number) => void
  removeLine: (key: string) => void
  clearCart: () => void
  setDiscount: (discount: number) => void
  getSubtotal: () => number
  getTotal: () => number
  toSaleItems: () => {
    productId: number
    quantity: number
    unitPrice: number
    stockQuantity?: number
    priceLabel?: string
    displayName?: string
    isFreeService?: boolean
  }[]
}

function lineKey(
  productId: number,
  unitPrice: number,
  unitsPerPack: number,
  priceLabel: string
): string {
  return `${productId}-${unitPrice}-${unitsPerPack}-${priceLabel}`
}

export const usePosStore = create<PosState>((set, get) => ({
  lines: [],
  discount: 0,

  addProduct: (product, quantity, unitPrice, priceLabel, unitsPerPack = 1) => {
    const price = roundMoney(unitPrice)
    const pack = unitsPerPack > 0 ? unitsPerPack : 1
    const maxPacks = Math.floor(product.stock / pack)
    const key = lineKey(product.id, price, pack, priceLabel)
    set((s) => {
      const existing = s.lines.find((l) => l.key === key && !l.isService)
      if (existing) {
        const newQty = existing.quantity + quantity
        if (newQty > maxPacks) return s
        return {
          lines: s.lines.map((l) =>
            l.key === key
              ? {
                  ...l,
                  quantity: newQty,
                  lineTotal: roundMoney(newQty * price)
                }
              : l
          )
        }
      }
      if (quantity > maxPacks) return s
      return {
        lines: [
          ...s.lines,
          {
            key,
            productId: product.id,
            name: product.name,
            barcode: product.barcode,
            quantity,
            unitPrice: price,
            costPrice: product.costPrice,
            maxStock: maxPacks,
            lineTotal: roundMoney(quantity * price),
            priceLabel,
            unitsPerPack: pack,
            isService: false
          }
        ]
      }
    })
  },

  addServiceLine: (productId, description, unitPrice) => {
    const price = roundMoney(unitPrice)
    const name = description.trim()
    if (!name || price <= 0) return

    const key = `service-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    set((s) => ({
      lines: [
        ...s.lines,
        {
          key,
          productId,
          name,
          barcode: null,
          quantity: 1,
          unitPrice: price,
          costPrice: 0,
          maxStock: Number.MAX_SAFE_INTEGER,
          lineTotal: price,
          priceLabel: 'Servicio',
          unitsPerPack: 1,
          isService: true
        }
      ]
    }))
  },

  updateQuantity: (key, quantity) => {
    if (quantity <= 0) {
      get().removeLine(key)
      return
    }
    set((s) => ({
      lines: s.lines
        .map((l) => {
          if (l.key !== key) return l
          if (l.isService) return l
          const min = minQtyForCartLine(l.priceLabel)
          const nextQty = quantity < min ? min : quantity
          if (nextQty > l.maxStock) return l
          return {
            ...l,
            quantity: nextQty,
            lineTotal: roundMoney(nextQty * l.unitPrice)
          }
        })
        .filter((l) => l.quantity > 0)
    }))
  },

  removeLine: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),

  clearCart: () => set({ lines: [], discount: 0 }),

  setDiscount: (discount) => set({ discount: roundMoney(Math.max(0, discount)) }),

  getSubtotal: () => roundMoney(get().lines.reduce((sum, l) => sum + l.lineTotal, 0)),

  getTotal: () => roundMoney(Math.max(0, get().getSubtotal() - get().discount)),

  toSaleItems: () =>
    get().lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      stockQuantity: l.quantity * (l.unitsPerPack > 0 ? l.unitsPerPack : 1),
      priceLabel: l.isService ? undefined : l.priceLabel,
      displayName: l.isService ? l.name : undefined,
      isFreeService: l.isService
    }))
}))
