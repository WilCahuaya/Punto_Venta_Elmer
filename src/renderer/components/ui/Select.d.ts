interface SelectOption {
    value: string;
    label: string;
}
interface SelectProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    error?: string;
    required?: boolean;
}
export declare function Select({ label, value, onChange, options, placeholder, error, required }: SelectProps): React.JSX.Element;
export {};
