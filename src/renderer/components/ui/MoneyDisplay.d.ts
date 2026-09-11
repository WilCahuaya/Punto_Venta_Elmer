interface MoneyDisplayProps {
    amount: number;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}
/** Muestra montos siempre con 2 decimales. */
export declare function MoneyDisplay({ amount, className, size }: MoneyDisplayProps): React.JSX.Element;
export {};
