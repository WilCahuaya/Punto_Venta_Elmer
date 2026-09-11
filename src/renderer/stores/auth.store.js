import { create } from 'zustand';
export const useAuthStore = create((set) => ({
    session: null,
    loading: true,
    error: null,
    hydrate: async () => {
        set({ loading: true, error: null });
        const result = await window.api.auth.getSession();
        if (result.ok) {
            set({ session: result.data, loading: false });
        }
        else {
            set({ session: null, loading: false, error: result.error });
        }
    },
    login: async (username, password) => {
        set({ error: null });
        const result = await window.api.auth.login({ username, password });
        if (!result.ok) {
            set({ error: result.error });
            return false;
        }
        set({ session: result.data, error: null });
        return true;
    },
    logout: async () => {
        await window.api.auth.logout();
        set({ session: null, error: null });
    }
}));
