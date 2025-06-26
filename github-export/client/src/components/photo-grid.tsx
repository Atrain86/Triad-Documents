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
  
  console.log('Photo grid data:', { photos, projectId, isLoading, photoListLength: photoList.length });

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
    return <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading photos...</div>;
  }

  // Direct rendering approach - always show upload, then photos if they exist
  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
          {photoList.length > 0 ? 'Add More Photos' : 'Add Project Photos'}
        </h3>
        <SimpleCamera onFileSelect={handleFileSelect} />
      </div>
      
      {/* Photos section - only show if photos exist */}
      {photoList.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Project Photos ({photoList.length})
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photoList.map((photo: Photo) => (
              <div key={photo.id} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                  <img
                    src={`/uploads/${photo.filename}`}
                    alt={photo.description || photo.originalName}
                    className="w-full h-full object-cover absolute inset-0"
                    loading="eager"
                    onError={(e) => {
                      console.error('Image failed to load:', `/uploads/${photo.filename}`, photo);
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      if (target.parentElement) {
                        target.parentElement.innerHTML = `
                          <div class="w-full h-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-400 text-sm absolute inset-0">
                            Failed to load: ${photo.originalName}
                          </div>
                        `;
                      }
                    }}
                    onLoad={() => {
                      console.log('✓ Image displayed successfully:', photo.originalName);
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
      )}
    </div>
  );
}