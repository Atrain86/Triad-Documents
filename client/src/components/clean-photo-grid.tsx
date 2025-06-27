import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { uploadPhoto } from "@/lib/api";
import { type Photo } from "@shared/schema";
import SimplifiedUpload from "@/components/simplified-upload";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface CleanPhotoGridProps {
  projectId: number;
}

export default function CleanPhotoGrid({ projectId }: CleanPhotoGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showViewer, setShowViewer] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Fetch photos with aggressive refresh
  const { data: photos = [], isLoading, refetch } = useQuery<Photo[]>({
    queryKey: [`/api/projects/${projectId}/photos`],
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always considered stale
    gcTime: 0, // Don't cache
  });

  console.log('Photos data:', photos);
  console.log('Photos length:', photos.length);

  // Photo upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      console.log('Starting upload with files:', files);
      const results = [];
      for (const file of files) {
        const result = await uploadPhoto(projectId, file);
        results.push(result);
      }
      return results;
    },
    onSuccess: async () => {
      await refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      toast({ title: "Photos uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      uploadMutation.mutate(files);
    }
  };

  // Reset zoom and pan when changing photos
  const resetZoomAndPan = () => {
    setZoom(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(3, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(1, prev - 0.2));
    if (zoom <= 1.2) {
      setPanPosition({ x: 0, y: 0 }); // Reset pan when zooming out to normal
    }
  };

  // Mouse/touch handlers for pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading photos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Add Photos {uploadMutation.isPending && "(Uploading...)"}
        </h3>
        <SimplifiedUpload onFileSelect={handleFileSelect} />
      </div>

      {/* Only show photos section if photos exist */}
      {photos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Project Photos ({photos.length})
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <div key={photo.id} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    console.log('Photo clicked, index:', index);
                    setSelectedPhotoIndex(index);
                    setShowViewer(true);
                  }}
                  className="aspect-square bg-gray-100 dark:bg-gray-700 relative w-full hover:opacity-90 transition-opacity group"
                >
                  <img
                    src={`/uploads/${photo.filename}`}
                    alt={photo.originalName}
                    className="w-full h-full object-cover absolute inset-0"
                    loading="eager"
                    onLoad={() => console.log('Image loaded successfully:', photo.filename)}
                    onError={() => console.error('Image failed to load:', photo.filename)}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium bg-black bg-opacity-50 px-3 py-1 rounded">
                      View Full Size
                    </span>
                  </div>
                </button>
                
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {photo.originalName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(photo.uploadedAt).toLocaleDateString()}
                  </p>
                  {photo.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {photo.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simple Photo Viewer */}
      {showViewer && photos.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
          <div className="flex justify-between items-center p-4 text-white">
            <button 
              onClick={() => {
                setShowViewer(false);
                resetZoomAndPan();
              }}
              className="p-2 hover:bg-gray-700 rounded"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="text-sm">
              {selectedPhotoIndex + 1} of {photos.length}
            </span>
            
            {/* Zoom Controls */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleZoomOut}
                className="p-2 hover:bg-gray-700 rounded"
                disabled={zoom <= 1}
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-xs text-gray-300 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={handleZoomIn}
                className="p-2 hover:bg-gray-700 rounded"
                disabled={zoom >= 3}
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div 
            className="flex-1 flex items-center justify-center p-4 overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          >
            <img
              src={`/uploads/${photos[selectedPhotoIndex]?.filename}`}
              alt={photos[selectedPhotoIndex]?.originalName}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) translate(${panPosition.x / zoom}px, ${panPosition.y / zoom}px)`,
                transformOrigin: 'center center'
              }}
              draggable={false}
            />
          </div>

          {/* Navigation */}
          {photos.length > 1 && (
            <div className="flex justify-center items-center space-x-4 p-4 bg-black bg-opacity-50">
              <button
                onClick={() => {
                  setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
                  resetZoomAndPan();
                }}
                className="p-2 text-white hover:bg-gray-700 rounded"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              {/* Thumbnail navigation */}
              <div className="flex space-x-2 max-w-xs overflow-x-auto">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => {
                      setSelectedPhotoIndex(index);
                      resetZoomAndPan();
                    }}
                    className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                      index === selectedPhotoIndex ? 'border-blue-500' : 'border-gray-600'
                    }`}
                  >
                    <img
                      src={`/uploads/${photo.filename}`}
                      alt={photo.originalName}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => {
                  setSelectedPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
                  resetZoomAndPan();
                }}
                className="p-2 text-white hover:bg-gray-700 rounded"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}