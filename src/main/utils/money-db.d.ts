/** Convierte número a string DECIMAL(12,2) para SQLite. */
export declare function toMoneyDb(value: number): string;
/** Lee DECIMAL de SQLite como número con 2 decimales. */
export declare function fromMoneyDb(value: string | number | null | undefined): number;
