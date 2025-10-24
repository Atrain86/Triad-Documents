import sharp from "sharp";

export async function analyzeImageWhitePixels(imageBuffer: Buffer): Promise<number> {
  const { data, info } = await sharp(imageBuffer)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let whiteCount = 0;
  const threshold = 200;
  for (let i = 0; i < data.length; i++) {
    if (data[i] > threshold) whiteCount++;
  }

  return whiteCount / (info.width * info.height);
}

export async function detectWhiteRegions(imageBuffer: Buffer): Promise<boolean> {
  const { data, info } = await sharp(imageBuffer)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let whiteNeighbors = 0;
  let totalNeighbors = 0;
  const threshold = 200;

  for (let i = 1; i < data.length - 1; i++) {
    totalNeighbors++;
    if (data[i] > threshold) whiteNeighbors++;
  }

  return whiteNeighbors / totalNeighbors > 0.6;
}
