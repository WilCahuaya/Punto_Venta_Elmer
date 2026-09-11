interface CashTicketsPanelProps {
    /** Preseleccionar turno (p. ej. desde detalle de cierre). */
    initialSessionId?: number | null;
    onUpdated?: () => void;
}
export declare function CashTicketsPanel({ initialSessionId, onUpdated }: CashTicketsPanelProps): React.JSX.Element;
export {};
