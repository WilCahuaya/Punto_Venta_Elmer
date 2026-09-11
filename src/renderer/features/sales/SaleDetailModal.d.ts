interface SaleDetailModalProps {
    open: boolean;
    saleId: number | null;
    onClose: () => void;
    onVoid?: (saleId: number) => void;
    onReturn?: (saleId: number) => void;
}
export declare function SaleDetailModal({ open, saleId, onClose, onVoid, onReturn }: SaleDetailModalProps): React.JSX.Element;
export {};
