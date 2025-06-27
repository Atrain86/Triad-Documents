import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { uploadPhoto } from "@/lib/api";
import { type Photo } from "@shared/schema";
import SimplifiedUpload from "@/components/simplified-upload";
import { X, Crop, Minimize2, Maximize2 } from "lucide-react";
import Cropper from "react-easy-crop";

interface CleanPhotoGridProps {
  projectId: number;
}

export default function CleanPhotoGrid({ projectId }: CleanPhotoGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showViewer, setShowViewer] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Fetch photos with aggressive refresh
  const { data: photos = [], isLoading, refetch } = useQuery<Photo[]>({
    queryKey: [`/api/projects/${projectId}/photos`],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/photos`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      return response.json();
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploadPromises = files.map(file => uploadPhoto(projectId, file));
      return Promise.all(uploadPromises);
    },
    onSuccess: async () => {
      // Force immediate refresh
      await refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      toast({ title: "Photos uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  // Cropped photo upload mutation
  const croppedUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return uploadPhoto(projectId, file);
    },
    onSuccess: async () => {
      await refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      toast({ title: "Cropped photo saved successfully" });
      setShowViewer(false);
    },
    onError: () => {
      toast({ title: "Failed to save cropped photo", variant: "destructive" });
    },
  });

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      uploadMutation.mutate(files);
    }
  };

  // Cropping callback
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Helper to create image from src
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  // Perform the actual crop
  const getCroppedImg = async (): Promise<Blob | null> => {
    try {
      const currentPhoto = photos[selectedPhotoIndex];
      if (!currentPhoto || !croppedAreaPixels) return null;

      const image = await createImage(`/uploads/${currentPhoto.filename}`);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return null;

      // Set canvas size to match cropped area
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      
      // Draw cropped image
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      // Convert to blob
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.9);
      });
    } catch (e) {
      console.error('Crop error:', e);
      return null;
    }
  };

  // Handle crop and save
  const handleCrop = async () => {
    try {
      const croppedBlob = await getCroppedImg();
      if (croppedBlob) {
        const fileName = `cropped-${Date.now()}.jpg`;
        const file = new File([croppedBlob], fileName, { type: 'image/jpeg' });
        croppedUploadMutation.mutate(file);
        setShowCropper(false);
        setShowViewer(false);
        // Reset crop state
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
      }
    } catch (e) {
      console.error('Crop failed:', e);
      toast({ title: "Crop failed", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading photos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Always show upload interface */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
          {photos.length > 0 ? 'Add More Photos' : 'Add Project Photos'}
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
                    onLoad={() => console.log('Photo loaded:', photo.originalName)}
                    onError={() => console.error('Photo failed to load:', photo.originalName)}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium bg-black bg-opacity-50 px-3 py-1 rounded">
                      View & Crop
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

      {/* Simple Photo Viewer with Zoom */}
      {showViewer && photos.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
          <div className="flex justify-between items-center p-4 text-white">
            <button 
              onClick={() => setShowViewer(false)}
              className="p-2 hover:bg-gray-700 rounded"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="text-sm">
              {selectedPhotoIndex + 1} of {photos.length}
            </span>
            <button 
              onClick={() => {
                setShowCropper(true);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setCroppedAreaPixels(null);
              }}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Crop className="w-4 h-4" />
              Crop
            </button>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={`/uploads/${photos[selectedPhotoIndex]?.filename}`}
              alt={photos[selectedPhotoIndex]?.originalName}
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: 'calc(100vh - 120px)' }}
            />
          </div>
          
          {photos.length > 1 && (
            <div className="p-4 bg-gray-900">
              <div className="flex gap-2 overflow-x-auto justify-center">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                      index === selectedPhotoIndex ? 'border-blue-500' : 'border-gray-600'
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
      )}

      {/* Crop Interface */}
      {showCropper && photos.length > 0 && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex justify-between items-center p-4 text-white">
            <button 
              onClick={() => setShowCropper(false)}
              className="p-2 hover:bg-gray-700 rounded"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="text-sm">Crop Photo</span>
            <button 
              onClick={handleCrop}
              disabled={croppedUploadMutation.isPending}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {croppedUploadMutation.isPending ? 'Saving...' : 'Save Crop'}
            </button>
          </div>

          <div className="relative flex-1">
            <Cropper
              image={`/uploads/${photos[selectedPhotoIndex]?.filename}`}
              crop={crop}
              zoom={zoom}
              aspect={4 / 3}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center justify-center p-4 space-x-4 bg-gray-900">
            <Minimize2 
              onClick={() => setZoom(Math.max(1, zoom - 0.1))} 
              className="cursor-pointer text-white hover:text-blue-400"
              size={20}
            />
            <input 
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 max-w-xs"
            />
            <Maximize2 
              onClick={() => setZoom(Math.min(3, zoom + 0.1))} 
              className="cursor-pointer text-white hover:text-blue-400"
              size={20}
            />
          </div>
        </div>
      )}
    </div>
  );
}