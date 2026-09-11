interface SessionDetailModalProps {
    open: boolean;
    sessionId: number | null;
    onClose: () => void;
    onOpenTickets?: (sessionId: number) => void;
}
export declare function SessionDetailModal({ open, sessionId, onClose, onOpenTickets }: SessionDetailModalProps): React.JSX.Element | null;
export {};
