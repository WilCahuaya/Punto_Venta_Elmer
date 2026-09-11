import type { CashSessionSummary } from '@shared/types/cash';
interface CashState {
    current: CashSessionSummary | null;
    loading: boolean;
    isOpen: boolean;
    hydrate: () => Promise<void>;
    refresh: () => Promise<void>;
    setCurrent: (session: CashSessionSummary | null) => void;
}
export declare const useCashStore: import("zustand").UseBoundStore<import("zustand").StoreApi<CashState>>;
export {};
