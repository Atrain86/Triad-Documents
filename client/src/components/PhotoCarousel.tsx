import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';

interface PhotoCarouselProps {
  photos: Array<{ id: number; filename: string; description?: string | null }>;
  initialIndex: number;
  onClose: () => void;
}

export default function PhotoCarousel({ photos, initialIndex, onClose }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isCarouselDragging, setIsCarouselDragging] = useState(false);
  const [carouselDragStart, setCarouselDragStart] = useState(0);
  const [carouselOffset, setCarouselOffset] = useState(0);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // Reset zoom and pan when changing photos
  useEffect(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
          break;
        case 'ArrowRight':
          if (currentIndex < photos.length - 1) setCurrentIndex(currentIndex + 1);
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleZoomReset();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photos.length, onClose]);

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.5, 0.5));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.5, Math.min(5, prev * delta)));
    }
  }, []);

  // Double click to zoom
  const handleDoubleClick = useCallback(() => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      handleZoomReset();
    }
  }, [zoom, handleZoomReset]);

  // Mouse drag handlers for panning and carousel
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (zoom > 1) {
      // Pan mode when zoomed
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    } else {
      // Carousel mode when not zoomed
      setIsCarouselDragging(true);
      setCarouselDragStart(e.clientX);
      setCarouselOffset(0);
    }
  }, [zoom, panX, panY]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && zoom > 1) {
      // Panning
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    } else if (isCarouselDragging && zoom === 1) {
      // Carousel dragging
      const diff = e.clientX - carouselDragStart;
      setCarouselOffset(diff);
    }
  }, [isDragging, isCarouselDragging, dragStart, carouselDragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    if (isCarouselDragging && zoom === 1) {
      // Handle carousel swipe
      const threshold = 100;
      if (Math.abs(carouselOffset) > threshold) {
        if (carouselOffset > 0 && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        } else if (carouselOffset < 0 && currentIndex < photos.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
      }
      setCarouselOffset(0);
    }
    
    setIsDragging(false);
    setIsCarouselDragging(false);
  }, [isCarouselDragging, carouselOffset, currentIndex, photos.length, zoom]);

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging || isCarouselDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isCarouselDragging, handleMouseMove, handleMouseUp]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({ x: touch.clientX - panX, y: touch.clientY - panY });
      } else {
        setIsCarouselDragging(true);
        setCarouselDragStart(touch.clientX);
        setCarouselOffset(0);
      }
    }
  }, [zoom, panX, panY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (isDragging && zoom > 1) {
        e.preventDefault();
        setPanX(touch.clientX - dragStart.x);
        setPanY(touch.clientY - dragStart.y);
      } else if (isCarouselDragging && zoom === 1) {
        e.preventDefault();
        const diff = touch.clientX - carouselDragStart;
        setCarouselOffset(diff);
      }
    }
  }, [isDragging, isCarouselDragging, dragStart, carouselDragStart, zoom]);

  const handleTouchEnd = useCallback(() => {
    if (isCarouselDragging && zoom === 1) {
      const threshold = 100;
      if (Math.abs(carouselOffset) > threshold) {
        if (carouselOffset > 0 && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        } else if (carouselOffset < 0 && currentIndex < photos.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
      }
      setCarouselOffset(0);
    }
    
    setIsDragging(false);
    setIsCarouselDragging(false);
  }, [isCarouselDragging, carouselOffset, currentIndex, photos.length, zoom]);

  const currentPhoto = photos[currentIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black bg-opacity-50">
        <div className="text-white">
          <span className="text-lg font-medium">
            {currentIndex + 1} of {photos.length}
          </span>
          {currentPhoto.description && (
            <p className="text-sm text-gray-300 mt-1">{currentPhoto.description}</p>
          )}
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="text-white hover:bg-white/20"
            disabled={zoom <= 0.5}
          >
            <ZoomOut size={20} />
          </Button>
          <span className="text-white text-sm min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            className="text-white hover:bg-white/20"
            disabled={zoom >= 5}
          >
            <ZoomIn size={20} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomReset}
            className="text-white hover:bg-white/20"
          >
            <RotateCcw size={20} />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X size={24} />
        </Button>
      </div>

      {/* Main Image Area */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center"
        onWheel={handleWheel}
      >
        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setCurrentIndex(currentIndex - 1)}
            className="absolute left-4 z-10 text-white hover:bg-white/20 rounded-full w-12 h-12"
          >
            <ChevronLeft size={32} />
          </Button>
        )}
        
        {currentIndex < photos.length - 1 && (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="absolute right-4 z-10 text-white hover:bg-white/20 rounded-full w-12 h-12"
          >
            <ChevronRight size={32} />
          </Button>
        )}

        {/* Image Container */}
        <div
          className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{
            transform: zoom === 1 ? `translateX(${carouselOffset}px)` : 'none'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          <img
            ref={imageRef}
            src={`/uploads/${currentPhoto.filename}`}
            alt={currentPhoto.description || `Photo ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain select-none transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'grab'
            }}
            draggable={false}
          />
        </div>
      </div>

      {/* Thumbnail Strip */}
      {photos.length > 1 && (
        <div className="bg-black bg-opacity-50 p-4">
          <div 
            ref={thumbnailsRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide justify-center"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 hover:border-white/50 transition-all ${
                  index === currentIndex 
                    ? 'border-white shadow-lg scale-110' 
                    : 'border-white/20'
                }`}
              >
                <img
                  src={`/uploads/${photo.filename}`}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}