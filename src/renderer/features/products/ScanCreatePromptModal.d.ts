interface ScanCreatePromptModalProps {
    open: boolean;
    barcode: string;
    onClose: () => void;
    onCreate: () => void;
}
export declare function ScanCreatePromptModal({ open, barcode, onClose, onCreate }: ScanCreatePromptModalProps): React.JSX.Element;
export {};
