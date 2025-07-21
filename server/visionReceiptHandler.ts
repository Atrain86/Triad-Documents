import fs from "fs";
import path from "path";
import sharp from 'sharp';
import { storage } from './storage';

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
export async function extractReceiptWithVision(imageBuffer: Buffer, originalName?: string, userId?: number): Promise<VisionReceiptData> {
  console.log('Vision API function called with buffer size:', imageBuffer.length);
  console.log('API key available:', !!OPENAI_API_KEY);
  
  if (!OPENAI_API_KEY) {
    console.error('No OpenAI API key found in environment');
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Aggressive compression to minimize API costs while maintaining readability
    // Resize to max 600px width (receipts are usually tall, not wide)
    // Reduce quality to 60% - still readable for text extraction
    // Convert to grayscale to reduce file size further
    const compressedBuffer = await sharp(imageBuffer)
      .resize(600, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
      .greyscale() // Remove color data - receipts are mostly black text on white
      .jpeg({ 
        quality: 60,
        progressive: true
      })
      .toBuffer();

    console.log('Compressed image from', imageBuffer.length, 'bytes to', compressedBuffer.length, 'bytes');
    console.log('Token reduction: ~', Math.round((1 - compressedBuffer.length / imageBuffer.length) * 100), '%');
    
    // If still too large (>200KB), apply ultra-compression
    let finalBuffer = compressedBuffer;
    if (compressedBuffer.length > 200000) {
      console.log('Applying ultra-compression for maximum cost savings...');
      finalBuffer = await sharp(imageBuffer)
        .resize(400, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .greyscale()
        .jpeg({ 
          quality: 45,
          progressive: true
        })
        .toBuffer();
      console.log('Ultra-compressed to:', finalBuffer.length, 'bytes');
    }

    // Convert compressed buffer to base64
    const imageBase64 = finalBuffer.toString("base64");
    const mimeType = 'image/jpeg'; // Always JPEG after compression

    const prompt = `
You are a receipt parser. Extract ONLY the vendor name and total amount from this receipt.

STRICT RULES:
- Vendor: Business name ONLY, remove location numbers, addresses, or extra identifiers
- Amount: Total paid ONLY, no currency symbols
- Do NOT include fuel types, item descriptions, reference numbers, or any extra text

Examples:
- "Shell Canada #1234" → "Shell"
- "McDonald's Restaurant #5678" → "McDonald's"  
- "Petro-Canada - Regular Gas" → "Petro-Canada"
- "Starbucks Coffee Canada #4987" → "Starbucks"

Return ONLY this JSON format:
{
  "vendor": "clean business name only",
  "amount": 12.50,
  "items": [],
  "date": "YYYY-MM-DD",
  "confidence": 0.9
}

If unable to read clearly:
{
  "vendor": "Unable to read",
  "amount": 0,
  "items": [],
  "date": null,
  "confidence": 0.1
}
`;

    const payload = {
      model: "gpt-4o", // Using full model to avoid mini rate limits
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

    console.log('Sending Vision API request...');
    console.log('API Key available:', !!OPENAI_API_KEY);
    console.log('Image size:', finalBuffer.length, 'bytes');
    console.log('Base64 preview (first 50 chars):', imageBase64.substring(0, 50) + '...');
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log('Vision API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Vision API error response:', errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Track token usage for admin analytics
    if (userId && data.usage) {
      try {
        const tokensUsed = data.usage.total_tokens || 0;
        const costPerToken = 0.00001; // Approximate cost for GPT-4o Vision
        const totalCost = tokensUsed * costPerToken;
        
        await storage.logTokenUsage({
          userId,
          operation: 'receipt_ocr',
          tokensUsed,
          cost: totalCost,
          model: 'gpt-4o',
          imageSize: finalBuffer.length,
          success: true
        });
        
        console.log(`Token usage logged: ${tokensUsed} tokens, $${totalCost.toFixed(4)} cost`);
      } catch (error) {
        console.error('Failed to log token usage:', error);
      }
    }
    
    if (!content) {
      throw new Error('No response from OpenAI Vision API');
    }

    // Parse JSON response (handle markdown code blocks)
    try {
      // Clean up response - remove markdown code blocks if present
      let cleanContent = content.trim();
      console.log('Raw OpenAI response:', content);
      
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('Cleaned content for parsing:', cleanContent);
      const parsedData = JSON.parse(cleanContent);
      
      // Clean and validate extracted data
      let cleanDate = null;
      if (parsedData.date) {
        // Clean date: AGGRESSIVELY remove ALL extra text, keep ONLY the date
        let dateStr = String(parsedData.date).trim();
        
        // Remove everything after the first space, comma, or common separators
        dateStr = dateStr.split(/[\s,;:|]+/)[0];
        
        // Remove common receipt suffixes that might be attached
        dateStr = dateStr.replace(/[A-Z]{2,}.*$/, ''); // Remove capital letter sequences
        dateStr = dateStr.replace(/\d{2}:\d{2}.*$/, ''); // Remove time patterns
        dateStr = dateStr.replace(/[#@$%^&*()]+.*$/, ''); // Remove special characters
        
        // Match ONLY valid date patterns (no extra characters allowed)
        const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})$|^(\d{2}-\d{2}-\d{2})$|^(\d{1,2}\/\d{1,2}\/\d{2,4})$/);
        if (dateMatch) {
          let cleanDateStr = dateMatch[0];
          // Convert YY-MM-DD to YYYY-MM-DD if needed
          if (cleanDateStr.match(/^\d{2}-\d{2}-\d{2}$/)) {
            const parts = cleanDateStr.split('-');
            const year = parseInt(parts[0]) > 50 ? `19${parts[0]}` : `20${parts[0]}`;
            cleanDateStr = `${year}-${parts[1]}-${parts[2]}`;
          }
          // Convert MM/DD/YY or MM/DD/YYYY to YYYY-MM-DD
          if (cleanDateStr.includes('/')) {
            const parts = cleanDateStr.split('/');
            let year = parts[2];
            if (year.length === 2) {
              year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
            }
            cleanDateStr = `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
          cleanDate = cleanDateStr;
        }
      }

      // Clean vendor name (remove extra info)
      let cleanVendor = String(parsedData.vendor || 'Unknown Vendor').trim();
      // Remove common extra text patterns
      cleanVendor = cleanVendor.replace(/\b(STORE|SHOP|INC|LLC|LTD|CORP)\b/gi, '').trim();
      cleanVendor = cleanVendor.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();

      // Clean items (remove codes, SKUs, extra descriptions, expand abbreviations)
      let cleanItems = [];
      if (Array.isArray(parsedData.items)) {
        cleanItems = parsedData.items.map((item: any) => {
          let cleanItem = String(item).trim();
          
          // Remove common patterns like SKUs, codes
          cleanItem = cleanItem.replace(/\b[A-Z0-9]{6,}\b/g, ''); // Remove long codes
          cleanItem = cleanItem.replace(/\$[\d.]+/g, ''); // Remove prices
          cleanItem = cleanItem.replace(/\bQTY\s*\d+\b/gi, ''); // Remove quantities
          
          // Expand common abbreviations to make items more readable
          cleanItem = cleanItem.replace(/\bGr\b/gi, 'Grande');
          cleanItem = cleanItem.replace(/\bVt\b/gi, 'Venti');
          cleanItem = cleanItem.replace(/\bTl\b/gi, 'Tall');
          cleanItem = cleanItem.replace(/\bCarml\b/gi, 'Caramel');
          cleanItem = cleanItem.replace(/\bMacchiato\b/gi, 'Macchiato');
          cleanItem = cleanItem.replace(/\bDs\b/gi, 'Double Smoked');
          cleanItem = cleanItem.replace(/\bSndwch\b/gi, 'Sandwich');
          cleanItem = cleanItem.replace(/\bSandwich\b/gi, 'Sandwich');
          cleanItem = cleanItem.replace(/\bBcn\b/gi, 'Bacon');
          cleanItem = cleanItem.replace(/\bEgg\b/gi, 'Egg');
          cleanItem = cleanItem.replace(/\bChs\b/gi, 'Cheese');
          cleanItem = cleanItem.replace(/\bCoff\b/gi, 'Coffee');
          cleanItem = cleanItem.replace(/\bLte\b/gi, 'Latte');
          cleanItem = cleanItem.replace(/\bCapp\b/gi, 'Cappuccino');
          cleanItem = cleanItem.replace(/\bFrap\b/gi, 'Frappuccino');
          cleanItem = cleanItem.replace(/\bMocha\b/gi, 'Mocha');
          cleanItem = cleanItem.replace(/\bVanilla\b/gi, 'Vanilla');
          cleanItem = cleanItem.replace(/\bChoc\b/gi, 'Chocolate');
          cleanItem = cleanItem.replace(/\bWip\b/gi, 'Whipped Cream');
          cleanItem = cleanItem.replace(/\bXtra\b/gi, 'Extra');
          cleanItem = cleanItem.replace(/\bReg\b/gi, 'Regular');
          cleanItem = cleanItem.replace(/\bDecaf\b/gi, 'Decaf');
          cleanItem = cleanItem.replace(/\bSkinny\b/gi, 'Skinny');
          cleanItem = cleanItem.replace(/\bNonfat\b/gi, 'Non-fat');
          cleanItem = cleanItem.replace(/\bSoy\b/gi, 'Soy');
          cleanItem = cleanItem.replace(/\bAlmond\b/gi, 'Almond');
          cleanItem = cleanItem.replace(/\bOat\b/gi, 'Oat');
          cleanItem = cleanItem.replace(/\bCoconut\b/gi, 'Coconut');
          
          // Clean up spacing and formatting
          cleanItem = cleanItem.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
          
          // Capitalize first letter of each word for better presentation
          cleanItem = cleanItem.replace(/\b\w/g, l => l.toUpperCase());
          
          return cleanItem;
        }).filter((item: string) => item.length > 2); // Keep only meaningful items
      }

      return {
        vendor: cleanVendor,
        amount: parseFloat(parsedData.amount) || 0,
        items: cleanItems,
        date: cleanDate,
        confidence: parsedData.confidence || 0.8,
        method: 'openai-vision'
      };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

  } catch (error) {
    console.error('Vision API extraction failed:', error);
    console.error('Error details:', (error as Error).message);
    
    // Log failed token usage attempt for analytics
    if (userId) {
      try {
        await storage.logTokenUsage({
          userId,
          operation: 'receipt_ocr_failed',
          tokensUsed: 0,
          cost: 0,
          model: 'gpt-4o',
          imageSize: imageBuffer.length,
          success: false,
          errorMessage: (error as Error).message || 'Unknown error'
        });
      } catch (logError) {
        console.error('Failed to log failed token usage:', logError);
      }
    }
    
    // Return fallback data instead of throwing
    return extractReceiptFallback(originalName || 'unknown');
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