import { create } from 'zustand';
export const useCashStore = create((set) => ({
    current: null,
    loading: true,
    isOpen: false,
    hydrate: async () => {
        set({ loading: true });
        const result = await window.api.cash.getCurrent();
        if (result.ok) {
            set({
                current: result.data,
                isOpen: result.data?.status === 'open',
                loading: false
            });
        }
        else {
            set({ current: null, isOpen: false, loading: false });
        }
    },
    refresh: async () => {
        const result = await window.api.cash.getCurrent();
        if (result.ok) {
            set({
                current: result.data,
                isOpen: result.data?.status === 'open'
            });
        }
    },
    setCurrent: (session) => {
        set({
            current: session,
            isOpen: session?.status === 'open'
        });
    }
}));
