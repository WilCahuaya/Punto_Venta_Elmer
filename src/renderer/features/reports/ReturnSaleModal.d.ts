import type { ReportSaleRow } from '@shared/types/reports';
interface ReturnSaleModalProps {
    open: boolean;
    sale: ReportSaleRow | null;
    onClose: () => void;
    onSaved: () => void;
}
export declare function ReturnSaleModal({ open, sale, onClose, onSaved }: ReturnSaleModalProps): React.JSX.Element;
export {};
