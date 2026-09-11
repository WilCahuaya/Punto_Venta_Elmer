interface ServiceModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (description: string, amount: number) => void;
}
export declare function ServiceModal({ open, onClose, onConfirm }: ServiceModalProps): React.JSX.Element;
export {};
