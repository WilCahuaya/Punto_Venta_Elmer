export declare function ensureImagesDir(): void;
export declare function pickImageFile(): Promise<string | null>;
export declare function storeProductImage(sourcePath: string, productId: number): string;
export declare function deleteImageIfExists(relativePath: string | null | undefined): void;
export declare function getImageMediaUrl(relativePath: string | null): string | null;
