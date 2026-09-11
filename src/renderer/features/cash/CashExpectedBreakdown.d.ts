import type { CashSessionSummary } from '@shared/types/cash';
interface CashExpectedBreakdownProps {
    session: CashSessionSummary;
    compact?: boolean;
}
export declare function CashExpectedBreakdown({ session, compact }: CashExpectedBreakdownProps): React.JSX.Element;
export {};
