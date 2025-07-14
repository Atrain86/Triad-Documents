// SHEET MUSIC PROCESSING WITH OPENAI VISION API
// Copy this code to your new project and add OPENAI_API_KEY to secrets

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SheetMusicData {
  title?: string;
  artist?: string;
  lyrics: string[];
  chords: string[];
  chordsAndLyrics: string; // Combined format for scrolling
  confidence: number;
}

/**
 * Extract lyrics and chords from sheet music PDF/image
 * Optimized for mobile scrolling and printing
 */
export async function extractSheetMusicData(base64Image: string): Promise<SheetMusicData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Latest model with best vision capabilities
      messages: [
        {
          role: "system",
          content: `You are a music transcription expert. Extract lyrics and chords from sheet music images.
          
          Format the output for mobile phone scrolling and printing:
          1. Extract ALL lyrics in correct verse/chorus order
          2. Extract ALL chord progressions 
          3. Create a combined format with chords above lyrics
          4. Keep original song structure (verse, chorus, bridge, etc.)
          5. Use simple chord notation (C, Am, F, G, etc.)
          
          Return ONLY valid JSON in this exact format:
          {
            "title": "Song Title",
            "artist": "Artist Name", 
            "lyrics": ["Line 1", "Line 2", "Line 3"],
            "chords": ["C", "Am", "F", "G"],
            "chordsAndLyrics": "Formatted text with chords above lyrics for mobile viewing",
            "confidence": 0.9
          }`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the song title, artist, lyrics, and chords from this sheet music. Format for mobile scrolling and printing. Return only JSON."
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
      max_tokens: 2000, // Larger limit for full song content
      temperature: 0.1, // Low temperature for accurate transcription
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      title: result.title || "Unknown Title",
      artist: result.artist || "Unknown Artist",
      lyrics: Array.isArray(result.lyrics) ? result.lyrics : [],
      chords: Array.isArray(result.chords) ? result.chords : [],
      chordsAndLyrics: result.chordsAndLyrics || "",
      confidence: result.confidence || 0.8
    };

  } catch (error) {
    console.error('OpenAI sheet music extraction failed:', error);
    throw new Error('Failed to extract sheet music data: ' + error.message);
  }
}

/**
 * Process PDF pages - convert PDF to images first, then process each page
 * You'll need a PDF-to-image library like pdf2pic or pdf-poppler
 */
export async function processPDFSheetMusic(pdfBuffer: Buffer): Promise<SheetMusicData[]> {
  // Note: You'll need to add PDF processing library to convert PDF pages to images
  // Example with pdf2pic:
  // 
  // import { pdf2pic } from "pdf2pic";
  // 
  // const convert = pdf2pic.fromBuffer(pdfBuffer, {
  //   density: 300,
  //   saveFilename: "page",
  //   savePath: "/tmp",
  //   format: "jpeg",
  //   width: 2000,
  //   height: 2000
  // });
  // 
  // const results = await convert.bulk(-1); // Convert all pages
  // 
  // const sheetMusicData = [];
  // for (const result of results) {
  //   const imageBuffer = fs.readFileSync(result.path);
  //   const base64Image = imageBuffer.toString('base64');
  //   const extracted = await extractSheetMusicData(base64Image);
  //   sheetMusicData.push(extracted);
  // }
  // 
  // return sheetMusicData;
  
  throw new Error('PDF processing not implemented - add pdf2pic or similar library');
}

/**
 * Format extracted data for mobile phone display
 */
export function formatForMobile(data: SheetMusicData): string {
  let formatted = '';
  
  if (data.title) {
    formatted += `${data.title}\n`;
    if (data.artist) {
      formatted += `by ${data.artist}\n`;
    }
    formatted += '\n';
  }
  
  // Use the pre-formatted chordsAndLyrics if available
  if (data.chordsAndLyrics) {
    formatted += data.chordsAndLyrics;
  } else {
    // Fallback: simple lyrics list
    formatted += data.lyrics.join('\n');
  }
  
  return formatted;
}

/**
 * Format extracted data for printing
 */
export function formatForPrint(data: SheetMusicData): string {
  let formatted = '';
  
  // Header
  formatted += `\n${'='.repeat(50)}\n`;
  if (data.title) {
    formatted += `TITLE: ${data.title}\n`;
  }
  if (data.artist) {
    formatted += `ARTIST: ${data.artist}\n`;
  }
  formatted += `${'='.repeat(50)}\n\n`;
  
  // Chord progression
  if (data.chords.length > 0) {
    formatted += 'CHORD PROGRESSION:\n';
    formatted += data.chords.join(' | ') + '\n\n';
  }
  
  // Lyrics with chords
  if (data.chordsAndLyrics) {
    formatted += 'LYRICS:\n';
    formatted += data.chordsAndLyrics;
  } else {
    formatted += 'LYRICS:\n';
    formatted += data.lyrics.join('\n');
  }
  
  formatted += `\n\n${'='.repeat(50)}\n`;
  formatted += `Transcribed with ${Math.round(data.confidence * 100)}% confidence\n`;
  
  return formatted;
}

// EXAMPLE USAGE:
//
// // For image file upload
// const imageBuffer = fs.readFileSync('sheet-music.jpg');
// const base64Image = imageBuffer.toString('base64');
// const extracted = await extractSheetMusicData(base64Image);
// 
// // Format for mobile
// const mobileFormat = formatForMobile(extracted);
// console.log(mobileFormat);
//
// // Format for printing  
// const printFormat = formatForPrint(extracted);
// console.log(printFormat);

export default {
  extractSheetMusicData,
  processPDFSheetMusic,
  formatForMobile,
  formatForPrint
};