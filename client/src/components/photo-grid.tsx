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

  if (isLoading) {
    return <div className="text-center text-gray-500 dark:text-gray-400">Loading photos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload Section - Only show if no photos exist */}
      {photoList.length === 0 && !isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
            Add Project Photos
          </h3>
          <SimpleCamera onFileSelect={handleFileSelect} />
        </div>
      )}
      
      {/* Photo Grid - Show photos if they exist */}
      {photoList.length > 0 && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Project Photos ({photoList.length})
            </h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add More Photos
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {photoList.map((photo: Photo) => (
              <div key={photo.id} className="relative group bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md">
                <div className="aspect-video">
                  <img
                    src={`/uploads/${photo.filename}`}
                    alt={photo.description || photo.originalName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log('Image failed to load:', `/uploads/${photo.filename}`, photo);
                      const target = e.currentTarget;
                      target.parentElement!.innerHTML = `
                        <div class="w-full h-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <span class="text-gray-500 dark:text-gray-400">Failed to load image</span>
                        </div>
                      `;
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully:', `/uploads/${photo.filename}`);
                    }}
                  />
                </div>
                
                {(photo.description || photo.originalName) && (
                  <div className="p-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {photo.description || photo.originalName}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(photo.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Hidden file input for adding more photos */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                handleFileSelect(files);
                e.target.value = '';
              }
            }}
            className="hidden"
          />
        </>
      )}

      {isLoading && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          Loading photos...
        </div>
      )}
    </div>
  );
}