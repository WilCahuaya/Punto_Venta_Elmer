export declare function printSaleTicket(saleId: number, printerOverride?: string): Promise<{
    ok: boolean;
    error?: string;
    method?: string;
}>;
/** Ticket de prueba para configuración de impresora. */
export declare function printTestTicket(): Promise<{
    ok: boolean;
    error?: string;
    method?: string;
}>;
