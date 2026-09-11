import type { PosProduct } from '@shared/types/sales';
interface QuantityModalProps {
    open: boolean;
    product: PosProduct | null;
    onClose: () => void;
    onConfirm: (quantity: number, unitPrice: number, priceLabel: string, unitsPerPack: number) => void;
}
export declare function QuantityModal({ open, product, onClose, onConfirm }: QuantityModalProps): React.JSX.Element | null;
export {};
