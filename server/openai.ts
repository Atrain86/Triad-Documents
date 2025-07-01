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
          content: `You are a receipt data extraction expert. Analyze receipt images and extract key information with high accuracy.

EXTRACTION RULES:
1. Find the VENDOR/STORE NAME (usually at top of receipt)
2. Find the TOTAL AMOUNT (look for "Total", "Amount Due", "Balance Due", etc.)
3. Extract the DATE if clearly visible
4. List 3-5 main ITEMS purchased (focus on actual products, skip service charges)
5. Provide CONFIDENCE score (0.0-1.0) based on image clarity

RESPONSE FORMAT: Return JSON only with this exact structure:
{
  "vendor": "Store Name",
  "amount": 99.99,
  "date": "2024-12-31",
  "items": ["item1", "item2", "item3"],
  "confidence": 0.9
}

IMPORTANT:
- Extract amount as number only (no currency symbols)
- Use ISO date format (YYYY-MM-DD) or null if unclear
- Focus on product names, not quantities or individual prices
- Set confidence based on image quality and text clarity`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please extract the receipt data from this image:"
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
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate and sanitize the response
    return {
      vendor: result.vendor || "Unknown Vendor",
      amount: parseFloat(result.amount) || 0,
      date: result.date || undefined,
      items: Array.isArray(result.items) ? result.items.slice(0, 5) : [],
      confidence: Math.max(0, Math.min(1, parseFloat(result.confidence) || 0.5))
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