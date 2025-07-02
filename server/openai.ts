import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ReceiptData {
  vendor: string;
  amount: number;
  date?: string;
  items?: string[];
  confidence: number;
}

/**
 * Extract receipt data using OpenAI Vision API
 * Provides more accurate results than tesseract.js for receipt processing
 */
export async function extractReceiptDataWithOpenAI(base64Image: string): Promise<ReceiptData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an assistant that extracts structured data from receipt images. You only return JSON with these fields: 'vendor', 'amount', and 'items'."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract vendor name, total amount, and main items from this receipt image. Return JSON only."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate and sanitize the response
    return {
      vendor: result.vendor || "Unknown Vendor",
      amount: parseFloat(result.amount) || 0,
      date: undefined, // Simplified - no date extraction
      items: Array.isArray(result.items) ? result.items.slice(0, 3) : [],
      confidence: 0.8 // Fixed confidence since we simplified the extraction
    };

  } catch (error) {
    console.error('OpenAI receipt extraction failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error('Failed to extract receipt data with OpenAI: ' + errorMessage);
  }
}

/**
 * Fallback function that combines tesseract.js with basic text parsing
 * Used when OpenAI processing fails or for redundancy
 */
export function parseReceiptText(text: string): Partial<ReceiptData> {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let vendor = '';
  let amount = 0;
  let date = '';
  const items: string[] = [];
  
  // Extract vendor (usually in first few lines)
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i];
    if (line.length > 3 && !line.match(/^\d+$/) && !line.includes('$')) {
      vendor = line;
      break;
    }
  }
  
  // Extract total amount - prioritize "Total" over "Subtotal"
  const totalPatterns = [
    /total[:\s]*\$?(\d+\.?\d*)/i,
    /amount due[:\s]*\$?(\d+\.?\d*)/i,
    /balance[:\s]*\$?(\d+\.?\d*)/i,
    /\$?(\d+\.\d{2})\s*total/i
  ];
  
  for (const line of lines) {
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        const foundAmount = parseFloat(match[1]);
        if (foundAmount > amount) { // Take the highest amount found
          amount = foundAmount;
        }
      }
    }
  }
  
  // Extract date
  const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/;
  for (const line of lines) {
    const match = line.match(datePattern);
    if (match) {
      date = match[1];
      break;
    }
  }
  
  // Extract items (lines that look like products)
  for (const line of lines) {
    // Skip lines that are clearly not items
    if (line.match(/^(total|subtotal|tax|discount|cash|card|change)/i)) continue;
    if (line.match(/^\$?\d+\.?\d*$/)) continue; // Just numbers
    if (line.length < 3) continue;
    
    // Look for product-like lines
    if (line.match(/[a-zA-Z]{3,}/) && items.length < 5) {
      items.push(line.replace(/\$[\d.]+/g, '').trim());
    }
  }
  
  return {
    vendor: vendor || undefined,
    amount: amount || undefined,
    date: date || undefined,
    items: items.length > 0 ? items : undefined,
    confidence: 0.6 // Lower confidence for text-only parsing
  };
}