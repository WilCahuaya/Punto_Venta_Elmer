import type { AppSettingsFull } from '@shared/types/settings';
interface SettingsState extends AppSettingsFull {
    hydrated: boolean;
    hydrate: () => Promise<void>;
    applyFromServer: (data: AppSettingsFull) => void;
    save: (input: Partial<AppSettingsFull>) => Promise<{
        ok: boolean;
        error?: string;
    }>;
}
export declare const useSettingsStore: import("zustand").UseBoundStore<import("zustand").StoreApi<SettingsState>>;
export {};
