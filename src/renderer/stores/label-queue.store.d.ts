import type { LabelPrintItem } from '@shared/types/labels';
export interface LabelQueueItem extends LabelPrintItem {
    id: string;
}
interface LabelQueueState {
    queue: LabelQueueItem[];
    addItem: (item: Omit<LabelQueueItem, 'id'>) => void;
    updateItem: (id: string, patch: Partial<Omit<LabelQueueItem, 'id'>>) => void;
    removeItem: (id: string) => void;
    applySizeToAll: (size: {
        presetId: string;
        widthMm: number;
        heightMm: number;
    }) => void;
    clear: () => void;
}
export declare const useLabelQueueStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<LabelQueueState>, "setState" | "persist"> & {
    setState(partial: LabelQueueState | Partial<LabelQueueState> | ((state: LabelQueueState) => LabelQueueState | Partial<LabelQueueState>), replace?: false | undefined): unknown;
    setState(state: LabelQueueState | ((state: LabelQueueState) => LabelQueueState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<LabelQueueState, {
            queue: LabelQueueItem[];
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: LabelQueueState) => void) => () => void;
        onFinishHydration: (fn: (state: LabelQueueState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<LabelQueueState, {
            queue: LabelQueueItem[];
        }, unknown>>;
    };
}>;
export {};
