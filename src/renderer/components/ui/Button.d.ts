import type { ButtonHTMLAttributes } from 'react';
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    fullWidth?: boolean;
}
export declare function Button({ variant, fullWidth, className, children, ...props }: ButtonProps): React.JSX.Element;
export {};
