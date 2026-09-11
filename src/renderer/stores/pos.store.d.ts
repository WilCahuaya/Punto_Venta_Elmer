import type { CartLine } from '@shared/types/sales';
interface PosState {
    lines: CartLine[];
    discount: number;
    addProduct: (product: {
        id: number;
        name: string;
        barcode: string | null;
        stock: number;
        costPrice: number;
    }, quantity: number, unitPrice: number, priceLabel: string, unitsPerPack?: number) => void;
    addServiceLine: (productId: number, description: string, unitPrice: number) => void;
    updateQuantity: (key: string, quantity: number) => void;
    removeLine: (key: string) => void;
    clearCart: () => void;
    setDiscount: (discount: number) => void;
    getSubtotal: () => number;
    getTotal: () => number;
    toSaleItems: () => {
        productId: number;
        quantity: number;
        unitPrice: number;
        stockQuantity?: number;
        priceLabel?: string;
        displayName?: string;
        isFreeService?: boolean;
    }[];
}
export declare const usePosStore: import("zustand").UseBoundStore<import("zustand").StoreApi<PosState>>;
export {};
