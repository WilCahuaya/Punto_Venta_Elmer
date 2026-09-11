import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LabelPrintItem } from '@shared/types/labels'

export interface LabelQueueItem extends LabelPrintItem {
  id: string
}

interface LabelQueueState {
  queue: LabelQueueItem[]
  addItem: (item: Omit<LabelQueueItem, 'id'>) => void
  updateItem: (id: string, patch: Partial<Omit<LabelQueueItem, 'id'>>) => void
  removeItem: (id: string) => void
  applySizeToAll: (size: { presetId: string; widthMm: number; heightMm: number }) => void
  clear: () => void
}

export const useLabelQueueStore = create<LabelQueueState>()(
  persist(
    (set) => ({
      queue: [],

      addItem: (item) =>
        set((state) => ({
          queue: [
            ...state.queue,
            { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }
          ]
        })),

      updateItem: (id, patch) =>
        set((state) => ({
          queue: state.queue.map((item) => (item.id === id ? { ...item, ...patch } : item))
        })),

      removeItem: (id) =>
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id)
        })),

      applySizeToAll: (size) =>
        set((state) => ({
          queue: state.queue.map((item) => ({
            ...item,
            presetId: size.presetId,
            widthMm: size.widthMm,
            heightMm: size.heightMm
          }))
        })),

      clear: () => set({ queue: [] })
    }),
    {
      name: 'pv-label-print-queue',
      partialize: (state) => ({ queue: state.queue })
    }
  )
)
