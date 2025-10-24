/**
 * Client-side image compression utility
 * Compresses images to reduce file size while maintaining quality
 */
export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'webp' | 'png';
}
export interface CompressionResult {
    file: File;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
}
export declare function compressImage(file: File, options?: CompressionOptions): Promise<CompressionResult>;
export declare function formatFileSize(bytes: number): string;
export declare function compressMultipleImages(files: File[], progressCallback?: (progress: {
    currentFile: number;
    totalFiles: number;
}) => void, compressionType?: 'photo' | 'receipt'): Promise<{
    compressedFiles: File[];
    totalCompressedSizeBytes: number;
}>;
export declare function compressPhotos(files: File[], progressCallback?: (progress: {
    currentFile: number;
    totalFiles: number;
}) => void): Promise<{
    compressedFiles: File[];
    totalCompressedSizeBytes: number;
}>;
export declare function compressReceipts(files: File[], progressCallback?: (progress: {
    currentFile: number;
    totalFiles: number;
}) => void): Promise<{
    compressedFiles: File[];
    totalCompressedSizeBytes: number;
}>;
