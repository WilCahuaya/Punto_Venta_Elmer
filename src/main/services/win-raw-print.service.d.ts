/** Nombre de cola Windows (p. ej. POS-80) desde nombre configurado. */
export declare function resolveWindowsQueueName(configuredName: string): Promise<string>;
/** Puerto físico (USB001, COM3, etc.). */
export declare function getWindowsPrinterPort(queueName: string): Promise<string | null>;
/**
 * Envía bytes ESC/POS con WinSpool API y tipo de documento RAW.
 */
export declare function sendRawBytesWinSpool(queueName: string, data: Buffer): Promise<void>;
/** Copia binaria directa al puerto USB/COM (sin cola GDI). */
export declare function sendRawBytesToPort(portName: string, data: Buffer): Promise<void>;
export declare function sendRawEscPosWindows(configuredPrinterName: string, data: Buffer): Promise<{
    method: string;
}>;
