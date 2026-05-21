import { create } from 'zustand'
import type { CartLine, PosProduct, PriceMode } from '@shared/types/sales'
import { roundMoney } from '@shared/lib/currency'

interface PosState {
  priceMode: PriceMode
  lines: CartLine[]
  discount: number
  setPriceMode: (mode: PriceMode) => void
  togglePriceMode: () => void
  addProduct: (product: PosProduct, quantity: number) => void
  updateQuantity: (key: string, quantity: number) => void
  removeLine: (key: string) => void
  clearCart: () => void
  setDiscount: (discount: number) => void
  getSubtotal: () => number
  getTotal: () => number
  toSaleItems: () => { productId: number; quantity: number; unitPrice: number }[]
}

function lineKey(productId: number, unitPrice: number): string {
  return `${productId}-${unitPrice}`
}

export const usePosStore = create<PosState>((set, get) => ({
  priceMode: 'retail',
  lines: [],
  discount: 0,

  setPriceMode: (mode) => set({ priceMode: mode }),

  togglePriceMode: () =>
    set((s) => ({
      priceMode: s.priceMode === 'retail' ? 'wholesale' : 'retail',
      lines: []
    })),

  addProduct: (product, quantity) => {
    const unitPrice = roundMoney(product.unitPrice)
    const key = lineKey(product.id, unitPrice)
    set((s) => {
      const existing = s.lines.find((l) => l.key === key)
      if (existing) {
        const newQty = existing.quantity + quantity
        if (newQty > product.stock) return s
        return {
          lines: s.lines.map((l) =>
            l.key === key
              ? {
                  ...l,
                  quantity: newQty,
                  lineTotal: roundMoney(newQty * unitPrice)
                }
              : l
          )
        }
      }
      if (quantity > product.stock) return s
      return {
        lines: [
          ...s.lines,
          {
            key,
            productId: product.id,
            name: product.name,
            barcode: product.barcode,
            quantity,
            unitPrice,
            costPrice: product.costPrice,
            maxStock: product.stock,
            lineTotal: roundMoney(quantity * unitPrice)
          }
        ]
      }
    })
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
          if (quantity > l.maxStock) return l
          return {
            ...l,
            quantity,
            lineTotal: roundMoney(quantity * l.unitPrice)
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
      unitPrice: l.unitPrice
    }))
}))
