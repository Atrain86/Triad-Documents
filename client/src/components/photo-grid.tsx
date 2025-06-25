import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CloudUpload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Photo } from "@shared/schema";
import { uploadPhoto } from "@/lib/api";

interface PhotoGridProps {
  projectId: number;
}

export default function PhotoGrid({ projectId }: PhotoGridProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ['/api/projects', projectId, 'photos'],
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");
      return uploadPhoto(projectId, selectedFile, description);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'photos'] });
      toast({
        title: "Success",
        description: "Photo uploaded successfully.",
      });
      setSelectedFile(null);
      setDescription("");
      setIsUploadDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    uploadMutation.mutate();
  };

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading photos...</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Upload Area */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogTrigger asChild>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 cursor-pointer bg-white dark:bg-gray-800">
            <CloudUpload className="mx-auto text-3xl text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Upload Photos</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG up to 10MB</p>
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="photo">Select Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Front exterior - Before"
                className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsUploadDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Grid */}
      {photos.map((photo) => (
        <div key={photo.id} className="relative group">
          <img
            src={`/uploads/${photo.filename}`}
            alt={photo.description || photo.originalName}
            className="w-full h-48 object-cover rounded-lg shadow-md"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all duration-200">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white text-gray-700 shadow-md hover:bg-gray-50"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = `/uploads/${photo.filename}`;
                  link.download = photo.originalName;
                  link.click();
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {photo.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{photo.description}</p>
          )}
        </div>
      ))}

      {photos.length === 0 && (
        <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">
          <p>No photos uploaded yet. Click the upload area to add photos.</p>
        </div>
      )}
    </div>
  );
}
