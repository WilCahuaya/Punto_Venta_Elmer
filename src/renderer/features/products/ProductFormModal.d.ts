import type { Category, Product } from '@shared/types/catalog';
interface ProductFormModalProps {
    open: boolean;
    product: Product | null;
    categories: Category[];
    /** Código escaneado al crear desde el lector (modo híbrido). */
    initialBarcode?: string;
    onClose: () => void;
    onSaved: () => void;
}
export declare function ProductFormModal({ open, product, categories, initialBarcode, onClose, onSaved }: ProductFormModalProps): React.JSX.Element;
export {};
