interface MoneyInputProps {
    label?: string;
    value: number;
    onChange: (value: number) => void;
    error?: string;
    required?: boolean;
}
export declare function MoneyInput({ label, value, onChange, error, required }: MoneyInputProps): React.JSX.Element;
export {};
