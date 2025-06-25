import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { uploadPhoto } from "@/lib/api";
import { type Photo } from "@shared/schema";
import UnifiedUpload from "./unified-upload";

interface PhotoGridProps {
  projectId: number;
}

export default function PhotoGrid({ projectId }: PhotoGridProps) {
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  if (isLoading) {
    return <div className="text-center text-gray-500 dark:text-gray-400">Loading photos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Unified Upload */}
      <UnifiedUpload 
        onPhotoSelect={handleFileSelect}
        onReceiptSelect={() => {}} // Handle receipts elsewhere
        title="Add Project Photos"
      />
      
      {/* Photo Grid */}
      {photoList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {photoList.map((photo: Photo) => (
            <div key={photo.id} className="relative group">
              {photo.filename ? (
                <img
                  src={`/uploads/${photo.filename}`}
                  alt={photo.description || photo.originalName}
                  className="w-full h-48 object-cover rounded-lg shadow-md bg-gray-100 dark:bg-gray-700"
                  onError={(e) => {
                    console.log('Image failed to load:', `/uploads/${photo.filename}`, photo);
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', `/uploads/${photo.filename}`);
                  }}
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400">No image available</span>
                </div>
              )}

              {photo.description && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">{photo.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {photoList.length === 0 && !isLoading && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No photos uploaded yet. Use the button above to add your first photo.
        </div>
      )}
    </div>
  );
}