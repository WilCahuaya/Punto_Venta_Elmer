import type { Product } from '@shared/types/catalog';
interface ScanStockSuccessModalProps {
    open: boolean;
    product: Product | null;
    previousStock: number;
    onClose: () => void;
    onAdjustMore: () => void;
}
export declare function ScanStockSuccessModal({ open, product, previousStock, onClose, onAdjustMore }: ScanStockSuccessModalProps): React.JSX.Element;
export {};
