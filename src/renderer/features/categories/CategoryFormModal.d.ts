import type { Category } from '@shared/types/catalog';
interface CategoryFormModalProps {
    open: boolean;
    category: Category | null;
    allCategories: Category[];
    onClose: () => void;
    onSaved: () => void;
}
export declare function CategoryFormModal({ open, category, allCategories, onClose, onSaved }: CategoryFormModalProps): React.JSX.Element;
export {};
