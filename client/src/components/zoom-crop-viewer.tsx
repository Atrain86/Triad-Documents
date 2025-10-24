import React, { useState, useRef, useCallback } from 'react';
import { X, Crop, Camera } from 'lucide-react';
import type { Photo } from '@shared/schema';

interface SimpleZoomCropProps {
  photos: Photo[];
  onAddCroppedPhoto: (file: File) => void;
  onClose: () => void;
  initialIndex?: number;
}

const SimpleZoomCrop = ({ photos = [], onAddCroppedPhoto, onClose, initialIndex = 0 }: SimpleZoomCropProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [showCropButton, setShowCropButton] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Safety check for photos array
  if (!photos || photos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <p>No photos to display</p>
          <button onClick={onClose} className="mt-4 bg-blue-600 px-4 py-2 rounded">
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];

  // Reset view when photo changes
  const resetView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setShowCropButton(false);
  }, []);

  // Handle pinch zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(Math.max(scale + delta, 1), 5);
    setScale(newScale);
    setShowCropButton(newScale > 1);
  }, [scale]);

  // Handle touch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      setLastPanPoint({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPanning && e.touches.length === 1 && scale > 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - lastPanPoint.x;
      const deltaY = e.touches[0].clientY - lastPanPoint.y;
      
      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  }, [isPanning, lastPanPoint, scale]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle mouse pan (for desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [scale]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && scale > 1) {
      e.preventDefault();
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastPanPoint, scale]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Handle crop functionality
  const handleCrop = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const container = containerRef.current;
    
    // Get container dimensions
    const containerRect = container.getBoundingClientRect();
    const canvasWidth = containerRect.width;
    const canvasHeight = containerRect.height;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Create a new image element to load the current photo
    const imageElement = new Image();
    imageElement.crossOrigin = 'anonymous';
    
    imageElement.onload = () => {
      // Calculate the visible portion based on scale and position
      const imgRect = img.getBoundingClientRect();
      const containerLeft = containerRect.left;
      const containerTop = containerRect.top;
      
      // Draw the visible portion
      ctx.drawImage(
        imageElement,
        (containerLeft - imgRect.left) / scale,
        (containerTop - imgRect.top) / scale,
        canvasWidth / scale,
        canvasHeight / scale,
        0,
        0,
        canvasWidth,
        canvasHeight
      );

      // Convert to blob and add to photos
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onAddCroppedPhoto(file);
        }
      }, 'image/jpeg', 0.9);
    };
    
    imageElement.src = `/uploads/${currentPhoto.filename}`;
  }, [scale, onAddCroppedPhoto, currentPhoto.filename]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
        <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded">
          <X className="w-6 h-6" />
        </button>
        <span className="text-sm">
          {currentIndex + 1} of {photos.length}
        </span>
        {showCropButton && (
          <button 
            onClick={handleCrop}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Crop className="w-4 h-4" />
            Crop View
          </button>
        )}
      </div>

      {/* Image Viewer */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-gray-900 cursor-move"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imageRef}
          src={`/uploads/${currentPhoto.filename}`}
          alt={`Photo ${currentIndex + 1}`}
          className="absolute top-1/2 left-1/2 max-w-none transition-transform duration-200 select-none"
          style={{
            transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center'
          }}
          draggable={false}
        />
      </div>

      {/* Instructions */}
      <div className="bg-gray-800 text-white p-3 text-center">
        <p className="text-sm">
          {scale === 1 ? 
            "Scroll wheel to zoom in on details • Click and drag when zoomed" : 
            "Drag to move around • Crop button saves current view"
          }
        </p>
      </div>

      {/* Photo Navigation */}
      {photos.length > 1 && (
        <div className="bg-gray-900 p-4">
          <div className="flex gap-2 overflow-x-auto">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => {
                  setCurrentIndex(index);
                  resetView();
                }}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                  index === currentIndex ? 'border-blue-500' : 'border-gray-600'
                }`}
              >
                <img
                  src={`/uploads/${photo.filename}`}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleZoomCrop;