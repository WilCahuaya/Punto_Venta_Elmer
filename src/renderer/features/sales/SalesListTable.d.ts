import type { SaleListEntry } from '@shared/types/sales';
interface SalesListTableProps {
    sales: SaleListEntry[];
    emptyMessage?: string;
    onViewDetail: (sale: SaleListEntry) => void;
    onVoid?: (sale: SaleListEntry) => void;
    onReturn?: (sale: SaleListEntry) => void;
}
export declare function SalesListTable({ sales, emptyMessage, onViewDetail, onVoid, onReturn }: SalesListTableProps): React.JSX.Element;
export {};
