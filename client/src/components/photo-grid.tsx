import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { uploadPhoto } from "@/lib/api";
import { type Photo } from "@shared/schema";
import UnifiedUpload from "./unified-upload";
import SimpleCamera from "./simple-camera";

interface PhotoGridProps {
  projectId: number;
}

export default function PhotoGrid({ projectId }: PhotoGridProps) {
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: photos, isLoading, refetch } = useQuery<Photo[]>({
    queryKey: [`/api/projects/${projectId}/photos`],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/photos`);
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      return response.json();
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  const photoList = photos || [];
  
  console.log('Photo grid data:', { photos, projectId, isLoading });

  const uploadMutation = useMutation({
    mutationFn: async (data: { files: File[]; description: string }) => {
      console.log('Starting upload for files:', data.files);
      const uploadPromises = data.files.map(async (file) => {
        console.log('Uploading file:', file.name, file.size);
        return uploadPhoto(projectId, file, data.description);
      });
      const results = await Promise.all(uploadPromises);
      console.log('Upload results:', results);
      return results;
    },
    onSuccess: async (results) => {
      console.log('Upload successful, forcing photo refresh');
      // Clear cache and force refetch
      queryClient.removeQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      await refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      toast({
        title: "Success",
        description: `${results.length} photo(s) uploaded successfully.`,
      });
      setDescription("");
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload photos. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      console.log('Photo files selected:', files);
      uploadMutation.mutate({ files, description });
    }
  };

  // Force render based on photo count
  const hasPhotos = photoList && photoList.length > 0;
  
  console.log('PhotoGrid render check:', { 
    hasPhotos, 
    photoCount: photoList?.length || 0, 
    isLoading,
    photos: photoList 
  });

  if (isLoading) {
    return <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading photos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Always show current state for debugging */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Photos loaded: {photoList?.length || 0} | Loading: {isLoading ? 'Yes' : 'No'}
      </div>
      
      {/* Photo Display Section */}
      {hasPhotos ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Project Photos ({photoList.length})
            </h3>
            <SimpleCamera onFileSelect={handleFileSelect} />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photoList.map((photo: Photo) => (
              <div key={photo.id} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="aspect-square bg-gray-100 dark:bg-gray-700">
                  <img
                    src={`/uploads/${photo.filename}`}
                    alt={photo.description || photo.originalName}
                    className="w-full h-full object-cover"
                    loading="eager"
                    onError={(e) => {
                      console.error('Image failed to load:', `/uploads/${photo.filename}`, photo);
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'w-full h-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-400 text-sm';
                      errorDiv.textContent = 'Failed to load';
                      target.parentNode?.appendChild(errorDiv);
                    }}
                    onLoad={() => {
                      console.log('✓ Image loaded successfully:', `/uploads/${photo.filename}`);
                    }}
                  />
                </div>
                
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
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Add Your First Project Photo
          </h3>
          <SimpleCamera onFileSelect={handleFileSelect} />
        </div>
      )}
    </div>
  );
}