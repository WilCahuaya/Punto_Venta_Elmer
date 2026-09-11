import type { Product } from '@shared/types/catalog';
interface StockAdjustModalProps {
    open: boolean;
    product: Product | null;
    onClose: () => void;
    onSaved: () => void;
}
export declare function StockAdjustModal({ open, product, onClose, onSaved }: StockAdjustModalProps): React.JSX.Element;
export {};
