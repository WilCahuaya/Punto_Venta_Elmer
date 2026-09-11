import type { CashSessionSummary } from '@shared/types/cash';
interface CloseCashModalProps {
    open: boolean;
    summary: CashSessionSummary;
    onClose: () => void;
}
export declare function CloseCashModal({ open, summary, onClose }: CloseCashModalProps): React.JSX.Element;
export {};
