import type { PaymentMethod } from '@shared/lib/payment';
export interface PaymentConfirmPayload {
    amountPaid: number;
    paymentMethod: PaymentMethod;
    isCredit?: boolean;
    creditTo?: string;
}
interface PaymentModalProps {
    open: boolean;
    subtotal: number;
    discount: number;
    total: number;
    onClose: () => void;
    onConfirm: (payload: PaymentConfirmPayload) => Promise<void>;
}
export declare function PaymentModal({ open, subtotal, discount, total, onClose, onConfirm }: PaymentModalProps): React.JSX.Element;
export {};
