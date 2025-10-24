import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { uploadPhoto } from "@/lib/api";
import { type Photo } from "@shared/schema";
import SimpleCamera from "@/components/simple-camera";

interface WorkingPhotoGridProps {
  projectId: number;
}

export default function WorkingPhotoGrid({ projectId }: WorkingPhotoGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch photos
  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: [`/api/projects/${projectId}/photos`],
    queryFn: async () => {
      console.log('Fetching photos for project:', projectId);
      const response = await fetch(`/api/projects/${projectId}/photos`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      const data = await response.json();
      console.log('Fetched photos:', data);
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Upload handler
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      console.log('Uploading files:', files.map(f => f.name));
      const results = await Promise.all(
        files.map(file => uploadPhoto(projectId, file))
      );
      console.log('Upload results:', results);
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      toast({ title: "Photos uploaded successfully" });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  const handleFileSelect = (files: File[]) => {
    uploadMutation.mutate(files);
  };

  console.log('PhotoGrid render:', { photos, photoCount: photos.length, isLoading });

  if (isLoading) {
    return <div className="text-center py-8">Loading photos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-semibold mb-4 text-center">
          {photos.length > 0 ? `Add More Photos (${photos.length} current)` : 'Add Project Photos'}
        </h3>
        <SimpleCamera onFileSelect={handleFileSelect} />
        {uploadMutation.isPending && (
          <div className="mt-4 text-center text-blue-600">Uploading...</div>
        )}
      </div>

      {/* Photos Grid */}
      {photos.length > 0 ? (
        <div>
          <h3 className="text-xl font-bold mb-4">Project Photos ({photos.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <div 
                key={photo.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <div className="aspect-square bg-gray-100 dark:bg-gray-700">
                  <img
                    src={`/uploads/${photo.filename}`}
                    alt={photo.originalName}
                    className="w-full h-full object-cover"
                    onLoad={() => console.log('✅ Photo displayed:', photo.originalName)}
                    onError={(e) => {
                      console.error('❌ Photo failed to load:', photo.originalName, photo.filename);
                      console.error('Image URL:', `/uploads/${photo.filename}`);
                    }}
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {photo.originalName}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(photo.uploadedAt).toLocaleDateString()}
                  </p>
                  {photo.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      {photo.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg">No photos yet</p>
          <p className="text-sm">Use the camera or upload buttons above to add photos</p>
        </div>
      )}
    </div>
  );
}