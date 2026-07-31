import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LabelPrintItem } from '@shared/types/labels'

export interface LabelQueueItem extends LabelPrintItem {
  id: string
}

interface LabelQueueState {
  queue: LabelQueueItem[]
  addItem: (item: Omit<LabelQueueItem, 'id'>) => void
  removeItem: (id: string) => void
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

      removeItem: (id) =>
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id)
        })),

      clear: () => set({ queue: [] })
    }),
    {
      name: 'pv-label-print-queue',
      partialize: (state) => ({ queue: state.queue })
    }
  )
)
