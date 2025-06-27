import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { uploadPhoto } from "@/lib/api";
import { type Photo } from "@shared/schema";
import SimplifiedUpload from "@/components/simplified-upload";
import SimpleZoomCrop from "@/components/zoom-crop-viewer";

interface CleanPhotoGridProps {
  projectId: number;
}

export default function CleanPhotoGrid({ projectId }: CleanPhotoGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showViewer, setShowViewer] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

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

      {/* Zoom & Crop Viewer */}
      {showViewer && photos.length > 0 && (
        <SimpleZoomCrop
          photos={photos}
          initialIndex={selectedPhotoIndex}
          onAddCroppedPhoto={(file) => croppedUploadMutation.mutate(file)}
          onClose={() => setShowViewer(false)}
        />
      )}
    </div>
  );
}