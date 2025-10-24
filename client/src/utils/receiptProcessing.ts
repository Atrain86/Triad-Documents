// Utility functions for processing challenging receipts with multiple amounts

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
export function extractAmounts(text: string): AmountMatch[] {
  // Match various currency formats: $12.00, 12.00, $5, 15
  const regex = /\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g;
  const matches: AmountMatch[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const originalStr = match[0];
    const cleanValue = parseFloat(originalStr.replace(/[$,]/g, ''));
    
    // Filter out unrealistic amounts (too small or too large)
    if (cleanValue >= 0.01 && cleanValue <= 10000) {
      matches.push({
        value: cleanValue,
        original: originalStr,
        position: match.index
      });
    }
  }
  
  // Remove duplicates and sort by value descending
  const unique = matches.filter((amount, index, self) => 
    index === self.findIndex(a => a.value === amount.value)
  );
  
  return unique.sort((a, b) => b.value - a.value);
}

/**
 * Generate smart vendor guess from OCR text
 */
export function extractVendor(text: string): string {
  const lines = text.split('\n').filter(line => line.trim().length > 2);
  
  if (lines.length === 0) return 'Unknown Vendor';
  
  // Take first 1-3 lines and clean them up
  const vendorLines = lines.slice(0, 3);
  let vendor = vendorLines.join(' ').trim();
  
  // Clean up common OCR artifacts
  vendor = vendor.replace(/[^\w\s&.-]/g, ' '); // Remove special chars except common business ones
  vendor = vendor.replace(/\s+/g, ' '); // Collapse multiple spaces
  vendor = vendor.substring(0, 50); // Limit length
  
  return vendor || 'Unknown Vendor';
}

/**
 * Extract potential item descriptions
 */
export function extractItems(text: string): string[] {
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 2)
    .filter(line => !line.match(/^\$?\d+\.?\d*$/)) // Remove lines that are just amounts
    .slice(1, 6); // Skip first line (vendor), take next 5
  
  return lines;
}

/**
 * Determine if manual selection is needed based on confidence and amount count
 */
export function requiresManualSelection(amounts: AmountMatch[], confidence: number): boolean {
  // Require manual selection if:
  // 1. Multiple amounts detected
  // 2. Low confidence from OCR/GPT
  // 3. Amounts are very close to each other (might be confusing)
  
  if (amounts.length <= 1) return false;
  if (confidence < 0.7) return true;
  
  // Check if amounts are suspiciously close
  if (amounts.length >= 2) {
    const diff = Math.abs(amounts[0].value - amounts[1].value);
    if (diff < 2) return true; // Very close amounts, let user decide
  }
  
  return amounts.length > 2; // More than 2 amounts always requires selection
}

/**
 * Smart amount selection based on context clues
 */
export function selectBestAmount(amounts: AmountMatch[], text: string): number | null {
  if (amounts.length === 0) return null;
  if (amounts.length === 1) return amounts[0].value;
  
  const lowerText = text.toLowerCase();
  
  // Look for total indicators
  const totalIndicators = ['total', 'amount due', 'balance', 'subtotal'];
  for (const indicator of totalIndicators) {
    const indicatorPos = lowerText.indexOf(indicator);
    if (indicatorPos !== -1) {
      // Find amount closest to total indicator
      const closestAmount = amounts.reduce((prev, curr) => {
        const prevDist = Math.abs(prev.position - indicatorPos);
        const currDist = Math.abs(curr.position - indicatorPos);
        return currDist < prevDist ? curr : prev;
      });
      return closestAmount.value;
    }
  }
  
  // Fallback: choose the largest reasonable amount
  // (assuming largest amount is usually the total)
  return amounts[0].value;
}

/**
 * Process raw OCR text into structured receipt data
 */
export function processReceiptText(ocrText: string, gptEnhancement?: any): ProcessedReceiptData {
  const amounts = extractAmounts(ocrText);
  const vendor = extractVendor(ocrText);
  const items = extractItems(ocrText);
  
  let confidence = 0.6; // Base confidence for Tesseract
  let method = 'tesseract';
  
  // If GPT enhancement is available, use it
  if (gptEnhancement) {
    confidence = 0.8;
    method = 'tesseract+gpt';
  }
  
  const needsManualSelection = requiresManualSelection(amounts, confidence);
  const bestAmount = selectBestAmount(amounts, ocrText);
  const selectedAmount = needsManualSelection ? undefined : (bestAmount !== null ? bestAmount : undefined);
  
  return {
    vendor,
    amounts,
    selectedAmount,
    items,
    confidence,
    method,
    requiresManualSelection: needsManualSelection
  };
}