import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoCarouselProps {
  photos: Array<{ id: number; filename: string; description?: string | null }>;
  initialIndex: number;
  onClose: () => void;
}

export default function PhotoCarousel({ photos, initialIndex, onClose }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  const galleryRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Enhanced navigation functions with smooth animations
  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setDragOffset(0);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setDragOffset(0);
    }
  };

  // Touch/Mouse event handlers with improved desktop support
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setDragStart(clientX);
    setDragOffset(0);
    
    // Prevent default to stop text selection, image dragging
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    
    const diff = clientX - dragStart;
    setDragOffset(diff);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    
    const threshold = 50; // Reduced threshold for easier swiping
    const velocity = Math.abs(dragOffset);
    
    if (velocity > threshold) {
      if (dragOffset > 0 && currentIndex > 0) {
        // Swipe right - go to previous
        goToPrevious();
      } else if (dragOffset < 0 && currentIndex < photos.length - 1) {
        // Swipe left - go to next
        goToNext();
      }
    }
    
    setIsDragging(false);
    setDragOffset(0);
  };

  // Improved mouse events - only enable on desktop, not conflicting with touch
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle mouse events if no touch capability detected
    if ('ontouchstart' in window) return;
    
    e.preventDefault();
    e.stopPropagation();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || 'ontouchstart' in window) return;
    e.preventDefault();
    e.stopPropagation();
    handleMove(e.clientX);
  };

  const handleMouseUp = (e: MouseEvent) => {
    if ('ontouchstart' in window) return;
    e.preventDefault();
    e.stopPropagation();
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  // Clean up any drag state on component mount/unmount
  useEffect(() => {
    return () => {
      // Clean up body styles on unmount
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      setIsDragging(false);
      setDragOffset(0);
    };
  }, []);

  // Calculate transform for smooth sliding
  const getTransform = () => {
    const baseOffset = -currentIndex * 100;
    const dragPercentage = dragOffset / (containerRef.current?.offsetWidth || 1) * 100;
    return `translateX(${baseOffset + dragPercentage}%)`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-60 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-colors"
        type="button"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Photo Counter */}
      <div className="absolute top-4 left-4 z-60 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full">
        {currentIndex + 1} of {photos.length}
      </div>

      {/* Navigation Arrows - Enhanced for desktop */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-60 p-3 rounded-full bg-black bg-opacity-60 text-white hover:bg-opacity-80 transition-all duration-200 hover:scale-110"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {currentIndex < photos.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-60 p-3 rounded-full bg-black bg-opacity-60 text-white hover:bg-opacity-80 transition-all duration-200 hover:scale-110"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Photo Container with improved touch/mouse handling */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          touchAction: 'pan-y pinch-zoom'
        }}
      >
        {/* Photo Slider with smooth animations */}
        <div
          ref={galleryRef}
          className="flex w-full h-full"
          style={{
            transform: getTransform(),
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'transform'
          }}
        >
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="w-full h-full flex-shrink-0 flex items-center justify-center p-4"
            >
              <div className="max-w-full max-h-full flex flex-col items-center">
                <img
                  src={`/uploads/${photo.filename}`}
                  alt={photo.description || `Photo ${index + 1}`}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dot Indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {photos.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}