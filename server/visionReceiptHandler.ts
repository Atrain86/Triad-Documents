import fs from "fs";
import path from "path";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface VisionReceiptData {
  vendor: string;
  amount: number;
  items: string[];
  date?: string | null;
  confidence: number;
  method: string;
}

/**
 * Extract receipt data using OpenAI Vision API
 * More reliable than Tesseract for receipt processing
 */
export async function extractReceiptWithVision(imageBuffer: Buffer, originalName?: string): Promise<VisionReceiptData> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Convert buffer to base64
    const imageBase64 = imageBuffer.toString("base64");
    
    // Determine image type from file extension or buffer
    let mimeType = 'image/jpeg';
    if (originalName) {
      const ext = path.extname(originalName).toLowerCase();
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.webp') mimeType = 'image/webp';
    }

    const prompt = `
You are a helpful assistant. Extract receipt information from this image.

Please extract:
1. The vendor/store name
2. The total amount paid (in dollars)
3. Any items purchased (up to 5 main items)
4. The date if visible

Return the result as a JSON object like this:
{
  "vendor": "Store Name",
  "amount": 12.00,
  "items": ["Item 1", "Item 2"],
  "date": "2025-07-02",
  "confidence": 0.9
}

If the receipt is not clear or readable, return:
{
  "vendor": "Unable to read",
  "amount": 0,
  "items": [],
  "date": null,
  "confidence": 0.1
}

Focus on accuracy. If you're unsure about the total amount, look for keywords like "Total", "Amount Due", "Balance", or similar.
`;

    const payload = {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a receipt-parsing assistant. Always return valid JSON."
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1, // Low temperature for consistent results
    };

    const response = await global.fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI Vision API');
    }

    // Parse JSON response
    try {
      const parsedData = JSON.parse(content);
      
      // Validate required fields
      return {
        vendor: parsedData.vendor || 'Unknown Vendor',
        amount: parseFloat(parsedData.amount) || 0,
        items: Array.isArray(parsedData.items) ? parsedData.items : [],
        date: parsedData.date || null,
        confidence: parsedData.confidence || 0.8,
        method: 'openai-vision'
      };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

  } catch (error) {
    console.error('Vision API extraction failed:', error);
    throw error;
  }
}

/**
 * Fallback extraction using simple text patterns
 * Used when Vision API fails
 */
export function extractReceiptFallback(filename: string): VisionReceiptData {
  // Extract vendor from filename
  const vendor = filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[_-]/g, ' ') // Replace underscores/dashes with spaces
    .replace(/\d+/g, '') // Remove numbers
    .trim();

  return {
    vendor: vendor || 'Unknown Vendor',
    amount: 0,
    items: ['Manual entry required'],
    date: null,
    confidence: 0.1,
    method: 'filename-fallback'
  };
}