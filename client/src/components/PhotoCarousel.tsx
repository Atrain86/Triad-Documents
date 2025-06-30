import React, { useState, useCallback, useRef, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // Simple smooth scrolling navigation
  const goToNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, photos.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [goToPrevious, goToNext, onClose]);

  // Auto-scroll thumbnails to keep current photo visible
  useEffect(() => {
    if (thumbnailsRef.current) {
      const thumbnail = thumbnailsRef.current.children[currentIndex] as HTMLElement;
      if (thumbnail) {
        thumbnail.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    }
  }, [currentIndex]);

  // Touch/swipe handlers for smooth scrolling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStart(e.touches[0].clientX);
    setDragOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging) {
      const diff = e.touches[0].clientX - dragStart;
      setDragOffset(diff);
    }
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      const threshold = 50; // Minimum distance for swipe
      if (Math.abs(dragOffset) > threshold) {
        if (dragOffset > 0 && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        } else if (dragOffset < 0 && currentIndex < photos.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
      }
      setDragOffset(0);
      setIsDragging(false);
    }
  }, [isDragging, dragOffset, currentIndex, photos.length]);

  const currentPhoto = photos[currentIndex];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black bg-opacity-50">
        <div className="text-white text-sm">
          {currentIndex + 1} of {photos.length}
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
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="lg"
            onClick={goToPrevious}
            className="absolute left-4 z-10 text-white hover:bg-white/20 rounded-full w-12 h-12"
          >
            <ChevronLeft size={32} />
          </Button>
        )}
        
        {currentIndex < photos.length - 1 && (
          <Button
            variant="ghost"
            size="lg"
            onClick={goToNext}
            className="absolute right-4 z-10 text-white hover:bg-white/20 rounded-full w-12 h-12"
          >
            <ChevronRight size={32} />
          </Button>
        )}

        {/* Image Container with Smooth Transitions */}
        <div
          className="relative w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
          style={{
            transform: isDragging ? `translateX(${dragOffset}px)` : 'none'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={`/uploads/${currentPhoto.filename}`}
            alt={currentPhoto.description || `Photo ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain select-none"
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