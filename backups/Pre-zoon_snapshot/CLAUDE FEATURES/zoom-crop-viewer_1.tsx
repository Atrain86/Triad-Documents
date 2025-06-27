import React, { useState, useRef, useCallback } from 'react';
import { X, Crop, Camera } from 'lucide-react';

const SimpleZoomCrop = ({ photos = [], onAddCroppedPhoto, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [showCropButton, setShowCropButton] = useState(false);
  
  const imageRef = useRef(null);
  const containerRef = useRef(null);

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
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(Math.max(scale + delta, 1), 5);
    setScale(newScale);
    setShowCropButton(newScale > 1);
  }, [scale]);

  // Handle touch zoom
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      setLastPanPoint({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (isPanning && e.touches.length === 1) {
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
  }, [isPanning, lastPanPoint]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Crop current view
  const handleCrop = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    const container = containerRef.current;

    // Get container dimensions
    const containerRect = container.getBoundingClientRect();
    const canvasWidth = containerRect.width;
    const canvasHeight = containerRect.height;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Calculate what's visible in the viewport
    const imgRect = img.getBoundingClientRect();
    const containerLeft = containerRect.left;
    const containerTop = containerRect.top;

    // Draw the visible portion
    ctx.drawImage(
      img,
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
      const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onAddCroppedPhoto(file);
    }, 'image/jpeg', 0.9);
  }, [scale, onAddCroppedPhoto]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
        <button onClick={onClose} className="p-2">
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
        className="flex-1 overflow-hidden relative bg-gray-900"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          ref={imageRef}
          src={currentPhoto.url || URL.createObjectURL(currentPhoto)}
          alt={`Photo ${currentIndex + 1}`}
          className="absolute top-1/2 left-1/2 max-w-none transition-transform duration-200"
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
            "Pinch to zoom in on details • Scroll wheel on desktop" : 
            "Pan to move around • Crop button saves current view"
          }
        </p>
      </div>

      {/* Photo Navigation */}
      {photos.length > 1 && (
        <div className="bg-gray-900 p-4">
          <div className="flex gap-2 overflow-x-auto">
            {photos.map((photo, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  resetView();
                }}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                  index === currentIndex ? 'border-blue-500' : 'border-gray-600'
                }`}
              >
                <img
                  src={photo.url || URL.createObjectURL(photo)}
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

// Integration with your existing photo component
const PhotoViewer = ({ photos = [], onAddPhoto }) => {
  const [showViewer, setShowViewer] = useState(false);
  const [allPhotos, setAllPhotos] = useState(photos || []);

  const handleAddCroppedPhoto = (croppedFile) => {
    // Add the cropped photo to your photo library
    setAllPhotos(prev => [...prev, croppedFile]);
    onAddPhoto(croppedFile);
    setShowViewer(false);
  };

  return (
    <div>
      {/* Photo Thumbnails */}
      {allPhotos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 mt-4">
          {allPhotos.map((photo, index) => (
            <button
              key={index}
              onClick={() => setShowViewer(true)}
              className="aspect-square rounded-lg overflow-hidden bg-gray-100"
            >
              <img
                src={photo.url || URL.createObjectURL(photo)}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No photos yet</p>
        </div>
      )}

      {/* Zoom & Crop Viewer */}
      {showViewer && allPhotos.length > 0 && (
        <SimpleZoomCrop
          photos={allPhotos}
          onAddCroppedPhoto={handleAddCroppedPhoto}
          onClose={() => setShowViewer(false)}
        />
      )}
    </div>
  );
};

export default PhotoViewer;