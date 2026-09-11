import type { CreditSaleEntry } from '@shared/types/sales';
interface CreditPayModalProps {
    open: boolean;
    entry: CreditSaleEntry | null;
    onClose: () => void;
    onPaid: (entry: CreditSaleEntry) => void;
}
export declare function CreditPayModal({ open, entry, onClose, onPaid }: CreditPayModalProps): React.JSX.Element;
export {};
