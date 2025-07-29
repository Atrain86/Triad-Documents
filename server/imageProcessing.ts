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

    // Process pixels to make white/light backgrounds transparent while preserving text
    const pixelArray = new Uint8Array(data);
    const channels = info.channels;
    const width = info.width;
    const height = info.height;
    
    // Create a map to track which pixels should be transparent
    const shouldBeTransparent = new Array(width * height).fill(false);
    
    // First pass: identify edge pixels (likely background)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x);
        const dataIndex = pixelIndex * channels;
        
        const r = pixelArray[dataIndex];
        const g = pixelArray[dataIndex + 1];
        const b = pixelArray[dataIndex + 2];
        
        // Check if pixel is near white/light colors
        if (r > 240 && g > 240 && b > 240) {
          // Check if it's on the edge or has white neighbors (likely background)
          const isEdge = x === 0 || x === width - 1 || y === 0 || y === height - 1;
          
          if (isEdge) {
            shouldBeTransparent[pixelIndex] = true;
          } else {
            // Check surrounding pixels - if most neighbors are also white, it's likely background
            let whiteNeighbors = 0;
            let totalNeighbors = 0;
            
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height && !(dx === 0 && dy === 0)) {
                  const neighborIndex = (ny * width + nx) * channels;
                  const nr = pixelArray[neighborIndex];
                  const ng = pixelArray[neighborIndex + 1];
                  const nb = pixelArray[neighborIndex + 2];
                  
                  if (nr > 240 && ng > 240 && nb > 240) {
                    whiteNeighbors++;
                  }
                  totalNeighbors++;
                }
              }
            }
            
            // If most neighbors are white, this is likely background
            if (whiteNeighbors / totalNeighbors > 0.6) {
              shouldBeTransparent[pixelIndex] = true;
            }
          }
        }
      }
    }
    
    // Second pass: flood fill from edge white pixels to remove large white background areas
    const visited = new Array(width * height).fill(false);
    
    const floodFill = (startX: number, startY: number) => {
      const stack = [[startX, startY]];
      
      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const pixelIndex = y * width + x;
        
        if (x < 0 || x >= width || y < 0 || y >= height || visited[pixelIndex]) {
          continue;
        }
        
        const dataIndex = pixelIndex * channels;
        const r = pixelArray[dataIndex];
        const g = pixelArray[dataIndex + 1];
        const b = pixelArray[dataIndex + 2];
        
        // Only continue if pixel is white/light
        if (!(r > 240 && g > 240 && b > 240)) {
          continue;
        }
        
        visited[pixelIndex] = true;
        shouldBeTransparent[pixelIndex] = true;
        
        // Add neighbors to stack
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    };
    
    // Start flood fill from all edge white pixels
    for (let x = 0; x < width; x++) {
      // Top and bottom edges
      const topIndex = x * channels;
      const bottomIndex = ((height - 1) * width + x) * channels;
      
      if (pixelArray[topIndex] > 240 && pixelArray[topIndex + 1] > 240 && pixelArray[topIndex + 2] > 240) {
        floodFill(x, 0);
      }
      if (pixelArray[bottomIndex] > 240 && pixelArray[bottomIndex + 1] > 240 && pixelArray[bottomIndex + 2] > 240) {
        floodFill(x, height - 1);
      }
    }
    
    for (let y = 0; y < height; y++) {
      // Left and right edges
      const leftIndex = (y * width) * channels;
      const rightIndex = (y * width + width - 1) * channels;
      
      if (pixelArray[leftIndex] > 240 && pixelArray[leftIndex + 1] > 240 && pixelArray[leftIndex + 2] > 240) {
        floodFill(0, y);
      }
      if (pixelArray[rightIndex] > 240 && pixelArray[rightIndex + 1] > 240 && pixelArray[rightIndex + 2] > 240) {
        floodFill(width - 1, y);
      }
    }
    
    // Apply transparency to identified background pixels
    for (let i = 0; i < shouldBeTransparent.length; i++) {
      if (shouldBeTransparent[i]) {
        pixelArray[i * channels + 3] = 0; // Set alpha to 0 (transparent)
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