import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useLabelQueueStore = create()(persist((set) => ({
    queue: [],
    addItem: (item) => set((state) => ({
        queue: [
            ...state.queue,
            { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }
        ]
    })),
    updateItem: (id, patch) => set((state) => ({
        queue: state.queue.map((item) => (item.id === id ? { ...item, ...patch } : item))
    })),
    removeItem: (id) => set((state) => ({
        queue: state.queue.filter((item) => item.id !== id)
    })),
    applySizeToAll: (size) => set((state) => ({
        queue: state.queue.map((item) => ({
            ...item,
            presetId: size.presetId,
            widthMm: size.widthMm,
            heightMm: size.heightMm
        }))
    })),
    clear: () => set({ queue: [] })
}), {
    name: 'pv-label-print-queue',
    partialize: (state) => ({ queue: state.queue })
}));
