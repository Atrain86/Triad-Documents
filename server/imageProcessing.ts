import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export async function removeWhiteBackground(inputPath: string, outputPath: string): Promise<void> {
  try {
    // Read the image and remove white background
    await sharp(inputPath)
      .flatten({ background: { r: 255, g: 255, b: 255, alpha: 0 } }) // Make white transparent
      .png({ 
        quality: 90,
        compressionLevel: 6,
        adaptiveFiltering: true,
        force: true // Force PNG format to support transparency
      })
      .toFile(outputPath);
    
    console.log(`Successfully removed white background from ${inputPath} and saved to ${outputPath}`);
  } catch (error) {
    console.error('Error removing white background:', error);
    throw error;
  }
}

export async function makeBackgroundTransparent(inputPath: string, outputPath: string): Promise<void> {
  try {
    // Load the image
    const image = sharp(inputPath);
    const { data, info } = await image
      .ensureAlpha() // Ensure alpha channel exists
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Process pixels to make white/light backgrounds transparent
    const pixelArray = new Uint8Array(data);
    const channels = info.channels;
    
    for (let i = 0; i < pixelArray.length; i += channels) {
      const r = pixelArray[i];
      const g = pixelArray[i + 1];
      const b = pixelArray[i + 2];
      
      // If pixel is close to white (allowing for slight variations)
      if (r > 240 && g > 240 && b > 240) {
        // Make it transparent
        pixelArray[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    // Create new image with processed pixels
    await sharp(pixelArray, {
      raw: {
        width: info.width,
        height: info.height,
        channels: channels
      }
    })
    .png({ quality: 90, force: true })
    .toFile(outputPath);
    
    console.log(`Successfully made background transparent for ${inputPath} and saved to ${outputPath}`);
  } catch (error) {
    console.error('Error making background transparent:', error);
    throw error;
  }
}