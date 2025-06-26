import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, FileText, ArrowLeft, Edit3, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import type { Project, Photo, Receipt } from '@shared/schema';

interface StreamlinedClientPageProps {
  projectId: number;
  onBack: () => void;
}

const aframeTheme = {
  gradients: {
    rainbow: 'linear-gradient(90deg, hsl(0, 100%, 60%), hsl(30, 100%, 60%), hsl(60, 100%, 60%), hsl(120, 100%, 50%), hsl(210, 100%, 60%))',
    primary: 'linear-gradient(45deg, hsl(210, 100%, 60%), hsl(120, 100%, 50%))',
    accent: 'linear-gradient(45deg, hsl(30, 100%, 60%), hsl(60, 100%, 60%))',
    destructive: 'linear-gradient(45deg, hsl(0, 100%, 60%), hsl(30, 100%, 60%))'
  }
};

export default function StreamlinedClientPage({ projectId, onBack }: StreamlinedClientPageProps) {
  const [notes, setNotes] = useState('');
  const [showPhotoCarousel, setShowPhotoCarousel] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: [`/api/projects/${projectId}/photos`],
  });

  const { data: receipts = [] } = useQuery<Receipt[]>({
    queryKey: [`/api/projects/${projectId}/receipts`],
  });

  const photoUploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      console.log('Uploading photos:', files.length); // Debug log
      
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('photos', file);
      });
      
      const response = await fetch(`/api/projects/${projectId}/photos`, {
        method: 'POST',
        body: formData
      });
      
      console.log('Upload response status:', response.status); // Debug log
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Failed to upload photos: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Upload successful:', result); // Debug log
      return result;
    },
    onSuccess: (data) => {
      console.log('Photos uploaded successfully:', data);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
    },
    onError: (error) => {
      console.error('Photo upload error:', error);
      alert('Failed to upload photos: ' + error.message);
    }
  });

  const receiptUploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('receipts', file);
      });
      
      const response = await fetch(`/api/projects/${projectId}/receipts`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to upload receipts');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/receipts`] });
    }
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      const response = await apiRequest('PATCH', `/api/projects/${projectId}`, { notes: newNotes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    }
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/invoice`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to generate invoice');
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${project?.clientName}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  });

  const handleCameraClick = () => {
    console.log('Camera button clicked');
    console.log('Camera input ref:', cameraInputRef.current);
    cameraInputRef.current?.click();
  };

  const handleReceiptClick = () => {
    receiptInputRef.current?.click();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Photo input changed');
    console.log('Files selected:', e.target.files?.length);
    
    if (e.target.files && e.target.files.length > 0) {
      console.log('Starting photo upload mutation');
      Array.from(e.target.files).forEach((file, index) => {
        console.log(`File ${index}:`, file.name, file.type, file.size);
      });
      
      photoUploadMutation.mutate(e.target.files);
      e.target.value = '';
    } else {
      console.log('No files selected');
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      receiptUploadMutation.mutate(e.target.files);
      e.target.value = '';
    }
  };

  const handleNotesBlur = () => {
    if (notes !== project?.notes) {
      updateNotesMutation.mutate(notes);
    }
  };

  const openPhotoCarousel = (index: number) => {
    setCarouselIndex(index);
    setShowPhotoCarousel(true);
  };

  React.useEffect(() => {
    if (project?.notes) {
      setNotes(project.notes);
    }
  }, [project?.notes]);

  if (!project) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div 
        className="h-1"
        style={{ background: aframeTheme.gradients.rainbow }}
      />
      
      <div className="p-6">
        <div className="flex items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mr-4 p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-semibold mb-1">{project.clientName}</h1>
            <p className="text-sm text-muted-foreground">{project.address}</p>
          </div>
        </div>

        <div className="flex gap-5 mb-8 justify-center">
          <button
            onClick={handleCameraClick}
            disabled={photoUploadMutation.isPending}
            className="w-16 h-16 rounded-full border-none cursor-pointer flex items-center justify-center transition-transform hover:scale-105 shadow-lg"
            style={{ background: aframeTheme.gradients.primary }}
            title="Take Photo"
          >
            <Camera size={28} color="white" />
          </button>

          <button
            onClick={handleReceiptClick}
            disabled={receiptUploadMutation.isPending}
            className="w-16 h-16 rounded-full border-none cursor-pointer flex items-center justify-center transition-transform hover:scale-105 shadow-lg"
            style={{ background: aframeTheme.gradients.accent }}
            title="Scan Receipt"
          >
            <FileText size={28} color="white" />
          </button>
        </div>

        {/* Photo Thumbnails Grid - ADD THIS SECTION */}
        {photos.length > 0 && (
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Camera size={16} />
              <span className="font-medium">Photos ({photos.length})</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => openPhotoCarousel(index)}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all"
                >
                  <img
                    src={`/uploads/photos/${photo.filename}`}
                    alt={photo.description || photo.originalName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Edit3 size={16} />
            <span className="font-medium">Project Notes</span>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add project notes, materials needed, color preferences, timeline, special requirements..."
            className="min-h-[120px] resize-vertical"
          />
        </div>

        <Button
          onClick={() => generateInvoiceMutation.mutate()}
          disabled={generateInvoiceMutation.isPending}
          className="w-full py-4 text-base font-semibold"
          style={{ background: aframeTheme.gradients.destructive }}
        >
          {generateInvoiceMutation.isPending ? 'Generating...' : 'Generate Invoice'}
        </Button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoUpload}
        multiple
        className="hidden"
      />
      
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleReceiptUpload}
        multiple
        className="hidden"
      />

      {/* Full Screen Photo Carousel - ADD THIS SECTION */}
      {showPhotoCarousel && photos.length > 0 && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
          {/* Close button */}
          <button
            onClick={() => setShowPhotoCarousel(false)}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center"
          >
            <X size={24} />
          </button>
          
          {/* Current photo */}
          <img
            src={`/uploads/photos/${photos[carouselIndex]?.filename}`}
            alt="Project Photo"
            className="max-w-[90%] max-h-[90%] object-contain"
          />
          
          {/* Navigation arrows (if more than 1 photo) */}
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setCarouselIndex(prev => prev > 0 ? prev - 1 : photos.length - 1)}
                className="absolute left-6 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center text-2xl"
              >
                ‹
              </button>
              <button
                onClick={() => setCarouselIndex(prev => prev < photos.length - 1 ? prev + 1 : 0)}
                className="absolute right-6 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center text-2xl"
              >
                ›
              </button>
            </>
          )}
          
          {/* Photo counter */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
            {carouselIndex + 1} of {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}