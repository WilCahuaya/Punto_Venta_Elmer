import type { UserSession } from '@shared/types/api';
interface AuthState {
    session: UserSession | null;
    loading: boolean;
    error: string | null;
    hydrate: () => Promise<void>;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
}
export declare const useAuthStore: import("zustand").UseBoundStore<import("zustand").StoreApi<AuthState>>;
export {};
