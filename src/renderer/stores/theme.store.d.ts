import type { AppSettings, ThemeMode } from '@shared/types/api';
interface ThemeState {
    theme: ThemeMode;
    currencySymbol: string;
    hydrated: boolean;
    hydrate: () => Promise<void>;
    setTheme: (theme: ThemeMode) => Promise<void>;
    toggleTheme: () => Promise<void>;
}
export declare const useThemeStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ThemeState>>;
export declare function useAppSettings(): AppSettings;
export {};
