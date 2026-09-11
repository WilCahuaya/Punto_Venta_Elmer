import type { ReportSaleRow } from '@shared/types/reports';
interface VoidSaleModalProps {
    open: boolean;
    sale: ReportSaleRow | null;
    onClose: () => void;
    onConfirm: (reason: string) => Promise<void>;
}
export declare function VoidSaleModal({ open, sale, onClose, onConfirm }: VoidSaleModalProps): React.JSX.Element;
export {};
