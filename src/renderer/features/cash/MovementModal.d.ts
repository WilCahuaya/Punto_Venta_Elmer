import type { CashMovementType } from '@shared/types/cash';
interface MovementModalProps {
    open: boolean;
    type: CashMovementType;
    onClose: () => void;
    onSaved: () => void;
}
export declare function MovementModal({ open, type, onClose, onSaved }: MovementModalProps): React.JSX.Element;
export {};
