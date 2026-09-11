interface NumberInputProps {
    label?: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number | string;
    /** Valor al salir del campo si quedó vacío. */
    emptyValue?: number;
    error?: string;
    required?: boolean;
    className?: string;
    id?: string;
}
export declare function NumberInput({ label, value, onChange, min, max, step, emptyValue, error, required, className, id }: NumberInputProps): React.JSX.Element;
export {};
