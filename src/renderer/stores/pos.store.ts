import { create } from 'zustand'
import type { CartLine } from '@shared/types/sales'
import { roundMoney } from '@shared/lib/currency'

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
    priceLabel: string
  ) => void
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
  lines: [],
  discount: 0,

  addProduct: (product, quantity, unitPrice, priceLabel) => {
    const price = roundMoney(unitPrice)
    const key = lineKey(product.id, price)
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
                  lineTotal: roundMoney(newQty * price)
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
            unitPrice: price,
            costPrice: product.costPrice,
            maxStock: product.stock,
            lineTotal: roundMoney(quantity * price),
            priceLabel
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
