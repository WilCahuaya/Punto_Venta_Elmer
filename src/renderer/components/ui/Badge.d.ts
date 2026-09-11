type BadgeVariant = 'default' | 'warning' | 'success' | 'muted';
interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
}
export declare function Badge({ children, variant }: BadgeProps): React.JSX.Element;
export {};
