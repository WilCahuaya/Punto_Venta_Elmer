export type CashPageTab = 'turno' | 'tickets' | 'cierres';
export declare const CASH_TABS: {
    id: CashPageTab;
    label: string;
}[];
export declare function parseCashTab(value: string | null): CashPageTab;
