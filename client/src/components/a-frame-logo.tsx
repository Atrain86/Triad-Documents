import { useEffect, useRef, useState } from 'react';
import logoImage from "@assets/11B133FD-4E46-4980-9620-6520E00C0B57_1753078345192.png";

interface AFrameLogoProps {
  className?: string;
}

export default function AFrameLogo({ className = "w-8 h-8" }: AFrameLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');

  useEffect(() => {
    const processImage = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Get image data to process transparency
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Remove any background that might be present
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const alpha = data[i + 3];
          
          // If pixel is very dark (close to black/gray background), make transparent
          const brightness = (r + g + b) / 3;
          const isBackground = brightness < 50 && alpha > 200; // Dark pixels with high alpha
          
          if (isBackground) {
            data[i + 3] = 0; // Set alpha to 0 (fully transparent)
          }
        }
        
        // Clear canvas and redraw with processed data
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to data URL with transparent background
        const dataUrl = canvas.toDataURL('image/png');
        setProcessedImageUrl(dataUrl);
      };
      
      img.src = logoImage;
    };

    processImage();
  }, []);

  return (
    <div className={`${className} flex items-center justify-center`} style={{ background: 'transparent' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {processedImageUrl ? (
        <img
          src={processedImageUrl}
          alt="Paint Brain Logo"
          className="max-w-full max-h-full"
          style={{ 
            objectFit: 'contain',
            background: 'transparent'
          }}
        />
      ) : (
        // Fallback while processing
        <img
          src={logoImage}
          alt="Paint Brain Logo"
          className="max-w-full max-h-full"
          style={{ 
            objectFit: 'contain',
            background: 'transparent'
          }}
        />
      )}
    </div>
  );
}