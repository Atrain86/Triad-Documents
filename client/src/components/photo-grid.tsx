import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Photo } from "@shared/schema";
import { uploadPhoto } from "@/lib/api";
import CameraUpload from "./camera-upload";

interface PhotoGridProps {
  projectId: number;
}

export default function PhotoGrid({ projectId }: PhotoGridProps) {
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ['/api/projects', projectId, 'photos'],
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'photos'] });
      toast({
        title: "Success",
        description: "Photos uploaded successfully.",
      });
      setDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload photos. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      uploadMutation.mutate({ files, description });
    }
  };

  if (isLoading) {
    return <div className="text-center text-gray-500 dark:text-gray-400">Loading photos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Camera Upload */}
      <CameraUpload 
        onFileSelect={handleFileSelect}
        title="Add Project Photos"
        description="Take photos or upload from your device"
      />
      
      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <img
                src={`/uploads/${photo.filename}`}
                alt={photo.description || photo.originalName}
                className="w-full h-48 object-cover rounded-lg shadow-md bg-gray-100 dark:bg-gray-700"
                onError={(e) => {
                  console.log('Image failed to load:', `/uploads/${photo.filename}`);
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', `/uploads/${photo.filename}`);
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                <a
                  href={`/uploads/${photo.filename}`}
                  download={photo.originalName}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <Button size="sm" variant="secondary">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </a>
              </div>
              {photo.description && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{photo.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {photos.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No photos uploaded yet. Use the camera above to add your first photo.
        </div>
      )}
    </div>
  );
}