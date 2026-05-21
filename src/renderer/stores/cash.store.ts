import { create } from 'zustand'
import type { CashSessionSummary } from '@shared/types/cash'

interface CashState {
  current: CashSessionSummary | null
  loading: boolean
  isOpen: boolean
  hydrate: () => Promise<void>
  refresh: () => Promise<void>
  setCurrent: (session: CashSessionSummary | null) => void
}

export const useCashStore = create<CashState>((set) => ({
  current: null,
  loading: true,
  isOpen: false,

  hydrate: async () => {
    set({ loading: true })
    const result = await window.api.cash.getCurrent()
    if (result.ok) {
      set({
        current: result.data,
        isOpen: result.data?.status === 'open',
        loading: false
      })
    } else {
      set({ current: null, isOpen: false, loading: false })
    }
  },

  refresh: async () => {
    const result = await window.api.cash.getCurrent()
    if (result.ok) {
      set({
        current: result.data,
        isOpen: result.data?.status === 'open'
      })
    }
  },

  setCurrent: (session) => {
    set({
      current: session,
      isOpen: session?.status === 'open'
    })
  }
}))
