export interface AmountMatch {
    value: number;
    original: string;
    position: number;
}
export interface ProcessedReceiptData {
    vendor: string;
    amounts: AmountMatch[];
    selectedAmount?: number;
    items: string[];
    confidence: number;
    method: string;
    requiresManualSelection: boolean;
}
/**
 * Extract all dollar amounts from OCR text
 */
export declare function extractAmounts(text: string): AmountMatch[];
/**
 * Generate smart vendor guess from OCR text
 */
export declare function extractVendor(text: string): string;
/**
 * Extract potential item descriptions
 */
export declare function extractItems(text: string): string[];
/**
 * Determine if manual selection is needed based on confidence and amount count
 */
export declare function requiresManualSelection(amounts: AmountMatch[], confidence: number): boolean;
/**
 * Smart amount selection based on context clues
 */
export declare function selectBestAmount(amounts: AmountMatch[], text: string): number | null;
/**
 * Process raw OCR text into structured receipt data
 */
export declare function processReceiptText(ocrText: string, gptEnhancement?: any): ProcessedReceiptData;
