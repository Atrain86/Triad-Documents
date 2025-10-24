import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, Trash2, Camera } from 'lucide-react';
import type { Project, Photo, Receipt } from '@shared/schema';

interface SimpleClientPageProps {
  projectId: number;
  onBack: () => void;
}

export default function SimpleClientPage({ projectId, onBack }: SimpleClientPageProps) {
  const queryClient = useQueryClient();
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  // Queries
  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: [`/api/projects/${projectId}/photos`],
  });

  // Photo upload mutation - simple approach
  const photoUploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('photos', file);
      });

      const response = await fetch(`/api/projects/${projectId}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      // Simple invalidation without temporal dead zone issues
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      }, 100);
    },
  });

  // Photo delete mutation - simple approach
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      
      return photoId;
    },
    onSuccess: () => {
      // Simple invalidation without temporal dead zone issues
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      }, 100);
    },
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      photoUploadMutation.mutate(e.target.files);
    }
  };

  const handleDeletePhoto = (photoId: number) => {
    deletePhotoMutation.mutate(photoId);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={onBack} variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-white">
          {project?.clientName || 'Loading...'}
        </h1>
      </div>

      {/* Photo Upload Section */}
      <Card className="mb-6 bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploadMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                {photoUploadMutation.isPending ? 'Uploading...' : 'Add Photos'}
              </Button>
            </div>

            <input
              ref={photoInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* Photo Grid */}
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={`/uploads/${photo.filename}`}
                    alt={photo.originalName || ''}
                    className="w-full h-24 object-cover rounded border border-gray-600"
                  />
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    disabled={deletePhotoMutation.isPending}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}