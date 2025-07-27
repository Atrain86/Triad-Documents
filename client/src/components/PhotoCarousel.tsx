import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import ErrorTooltip from './ui/error-tooltip';
import { useErrorTooltip } from '@/hooks/useErrorTooltip';


interface PhotoCarouselProps {
  photos: Array<{ id: number; filename: string; description?: string | null }>;
  initialIndex: number;
  onClose: () => void;
  onDelete?: (photoId: number) => void;
}

export default function PhotoCarousel({ photos, initialIndex, onClose, onDelete }: PhotoCarouselProps) {
  // Error tooltip system
  const { errorState, showDeleteError, hideError } = useErrorTooltip();
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  
  // Zoom state for pinch-to-zoom functionality
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [initialDistance, setInitialDistance] = useState(0);
  const [initialScale, setInitialScale] = useState(1);
  const [lastTap, setLastTap] = useState(0);
  const [isPinching, setIsPinching] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  const galleryRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Helper functions for pinch-to-zoom
  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (touches: React.TouchList) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const resetZoom = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    setPanOffset({ x: 0, y: 0 });
    setIsPinching(false);
  };

  // Enhanced navigation functions with smooth animations
  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setDragOffset(0);
      resetZoom(); // Reset zoom when changing photos
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setDragOffset(0);
      resetZoom(); // Reset zoom when changing photos
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
    
    const threshold = 100; // Increased threshold to avoid interference with pinch-zoom
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

  // Smooth touch events with optimized pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    const touchCount = e.touches.length;
    
    if (touchCount === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      
      // Check for double tap
      if (now - lastTap < 300) {
        e.preventDefault();
        // Double tap - smooth zoom toggle
        if (scale === 1) {
          setScale(2.5);
          setTranslateX(0);
          setTranslateY(0);
        } else {
          resetZoom();
        }
        return;
      }
      setLastTap(now);
      
      if (scale > 1) {
        // Start panning when zoomed
        e.preventDefault();
        setPanStart({ x: touch.clientX, y: touch.clientY });
        setPanOffset({ x: translateX, y: translateY });
      } else {
        // Start navigation drag when not zoomed
        handleStart(touch.clientX);
      }
    } else if (touchCount === 2) {
      // Pinch gesture start
      e.preventDefault();
      setIsDragging(false);
      setDragOffset(0);
      setIsPinching(true);
      
      const distance = getDistance(e.touches);
      setInitialDistance(distance);
      setInitialScale(scale);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchCount = e.touches.length;
    
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (touchCount === 2 && isPinching) {
      // Smooth pinch zoom with RAF
      e.preventDefault();
      const distance = getDistance(e.touches);
      
      if (initialDistance > 0) {
        animationFrameRef.current = requestAnimationFrame(() => {
          const scaleChange = distance / initialDistance;
          const newScale = Math.max(0.5, Math.min(5, initialScale * scaleChange));
          setScale(newScale);
        });
      }
    } else if (touchCount === 1 && scale > 1) {
      // Smooth panning when zoomed with RAF
      e.preventDefault();
      const touch = e.touches[0];
      
      animationFrameRef.current = requestAnimationFrame(() => {
        const deltaX = (touch.clientX - panStart.x) * 1.0;
        const deltaY = (touch.clientY - panStart.y) * 1.0;
        
        // Apply bounds to prevent panning too far
        const maxPan = 150 * scale;
        const newX = Math.max(-maxPan, Math.min(maxPan, panOffset.x + deltaX));
        const newY = Math.max(-maxPan, Math.min(maxPan, panOffset.y + deltaY));
        
        setTranslateX(newX);
        setTranslateY(newY);
      });
    } else if (touchCount === 1 && isDragging && scale === 1) {
      // Navigation swipe when not zoomed
      handleMove(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const remainingTouches = e.touches.length;
    
    // Clean up animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (remainingTouches === 0) {
      // All touches ended
      setIsPinching(false);
      setInitialDistance(0);
      
      // Snap scale to reasonable values with smooth transition
      if (scale < 1) {
        setScale(1);
        setTranslateX(0);
        setTranslateY(0);
      } else if (scale > 4) {
        setScale(4);
      }
      
      // Handle navigation swipe
      if (isDragging && scale === 1) {
        handleEnd();
      }
    } else if (remainingTouches === 1 && isPinching) {
      // One finger lifted during pinch - continue with pan
      setIsPinching(false);
      const touch = e.touches[0];
      setPanStart({ x: touch.clientX, y: touch.clientY });
      setPanOffset({ x: translateX, y: translateY });
    }
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
      
      // Clean up animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Calculate transform for smooth sliding
  const getTransform = () => {
    const baseOffset = -currentIndex * 100;
    const dragPercentage = dragOffset / (containerRef.current?.offsetWidth || 1) * 100;
    return `translateX(${baseOffset + dragPercentage}%)`;
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center"
      onClick={(e) => {
        // Close when clicking background
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[60] p-3 rounded-full bg-white bg-opacity-20 text-white hover:bg-opacity-30 transition-all duration-200 backdrop-blur-sm"
        type="button"
        style={{ zIndex: 9999 }}
      >
        <X className="w-8 h-8" />
      </button>

      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={() => {
            const currentPhoto = photos[currentIndex];
            if (currentPhoto) {
              try {
                onDelete(currentPhoto.id);
                // If this was the last photo or only photo, close carousel
                if (photos.length === 1) {
                  onClose();
                } else if (currentIndex === photos.length - 1) {
                  // If deleting last photo, go to previous
                  setCurrentIndex(currentIndex - 1);
                }
              } catch (error) {
                showDeleteError('photo', error as Error, () => {
                  onDelete(currentPhoto.id);
                });
              }
            }
          }}
          className="absolute top-4 right-20 z-[60] p-3 rounded-full bg-red-600 bg-opacity-80 text-white hover:bg-red-700 hover:bg-opacity-90 transition-all duration-200 backdrop-blur-sm"
          type="button"
          title="Delete Photo"
          style={{ zIndex: 9999 }}
        >
          <Trash2 className="w-6 h-6" />
        </button>
      )}

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
        className="w-full h-full flex items-center justify-center overflow-hidden select-none carousel-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none'
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
              <div 
                className="max-w-full max-h-full flex flex-col items-center"
                style={{
                  overflow: scale > 1 ? 'hidden' : 'visible'
                }}
              >
                {/* Custom pinch-to-zoom image with smooth transforms */}
                <img
                  ref={index === currentIndex ? imageRef : undefined}
                  src={`/uploads/${photo.filename}`}
                  alt={photo.description || `Photo ${index + 1}`}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl photo-zoom-image"
                  draggable={false}
                  style={{
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                    transform: index === currentIndex ? 
                      `scale3d(${scale}, ${scale}, 1) translate3d(${translateX / scale}px, ${translateY / scale}px, 0)` : 
                      'scale3d(1, 1, 1) translate3d(0, 0, 0)',
                    transformOrigin: 'center center',
                    transition: isPinching ? 'none' : 'transform 0.25s cubic-bezier(0.23, 1, 0.32, 1)'
                  } as React.CSSProperties}
                />
                
                {/* Zoom indicator for current image */}
                {index === currentIndex && scale > 1 && (
                  <div className="absolute top-8 right-8 z-60 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                    {Math.round(scale * 100)}%
                  </div>
                )}
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

      {/* Error Tooltip for PhotoCarousel */}
      <ErrorTooltip
        isVisible={errorState.isVisible}
        context={errorState.context}
        onClose={hideError}
      />
    </div>
  );
}