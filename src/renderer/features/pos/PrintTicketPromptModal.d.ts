interface PrintTicketPromptModalProps {
    open: boolean;
    saleId: number | null;
    ticketNumber: string;
    onPrint: (printerName: string) => Promise<void>;
    onSkip: () => void;
}
export declare function PrintTicketPromptModal({ open, saleId, ticketNumber, onPrint, onSkip }: PrintTicketPromptModalProps): React.JSX.Element;
export {};
