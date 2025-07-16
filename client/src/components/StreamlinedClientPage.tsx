// 📄 StreamlinedClientPage.tsx
import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, FileText, ArrowLeft, Edit3, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

interface Project {
  id: number;
  name: string;
  clientName: string;
  address: string;
  email: string;
  phone?: string;
  status: 'estimating' | 'in-progress' | 'completed';
  hourlyRate: number;
  notes?: string;
}

interface Photo {
  id: number;
  projectId: number;
  filename: string;
  originalName: string;
  description?: string;
  uploadedAt: string;
}

interface Receipt {
  id: number;
  projectId: number;
  filename: string;
  vendor: string;
  amount: number;
  description?: string;
  uploadedAt: string;
}

interface StreamlinedClientPageProps {
  projectId: number;
  onBack: () => void;
}

// A-Frame Design System
const aframeTheme = {
  colors: {
    background: 'hsl(var(--background))',
    surface: 'hsl(var(--card))',
    primary: {
      red: 'hsl(0, 100%, 60%)',
      orange: 'hsl(30, 100%, 60%)',
      yellow: 'hsl(60, 100%, 60%)',
      green: 'hsl(120, 100%, 50%)',
      blue: 'hsl(210, 100%, 60%)'
    }
  },
  gradients: {
    rainbow: 'linear-gradient(90deg, hsl(0, 100%, 60%), hsl(30, 100%, 60%), hsl(60, 100%, 60%), hsl(120, 100%, 50%), hsl(210, 100%, 60%))',
    primary: 'linear-gradient(45deg, hsl(210, 100%, 60%), hsl(120, 100%, 50%))',
    accent: 'linear-gradient(45deg, hsl(30, 100%, 60%), hsl(60, 100%, 60%))',
    destructive: 'linear-gradient(45deg, hsl(0, 100%, 60%), hsl(30, 100%, 60%))'
  }
};

export default function StreamlinedClientPage({ projectId, onBack }: StreamlinedClientPageProps) {
  const queryClient = useQueryClient();

  // ⚠️ FIX: Move state declaration to top to fix Temporal Dead Zone error
  const [totalCompressedSizeBytes, setTotalCompressedSizeBytes] = useState(0);

  const [notes, setNotes] = useState('');
  const [showPhotoCarousel, setShowPhotoCarousel] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Fetch project data
  const { data: project } = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    }
  });

  // Fetch photos
  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: ['photos', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/photos`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      return response.json();
    }
  });

  // Fetch receipts
  const { data: receipts = [] } = useQuery<Receipt[]>({
    queryKey: ['receipts', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/receipts`);
      if (!response.ok) throw new Error('Failed to fetch receipts');
      return response.json();
    }
  });

  // Photo upload mutation
  const photoUploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('photos', file);
      });
      
      const response = await fetch(`/api/projects/${projectId}/photos`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to upload photos');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', projectId] });
    }
  });

  // Receipt upload mutation
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
      queryClient.invalidateQueries({ queryKey: ['receipts', projectId] });
    }
  });

  // Notes update mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes })
      });
      
      if (!response.ok) throw new Error('Failed to update notes');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    }
  });

  // Invoice generation mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/invoice`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to generate invoice');
      return response.blob();
    },
    onSuccess: (blob) => {
      // Download the generated invoice PDF
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${project?.name}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  });

  // Event handlers
  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleReceiptClick = () => {
    receiptInputRef.current?.click();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      photoUploadMutation.mutate(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      receiptUploadMutation.mutate(e.target.files);
      e.target.value = ''; // Reset input
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
      {/* A-Frame Rainbow Header */}
      <div 
        className="h-1"
        style={{ background: aframeTheme.gradients.rainbow }}
      />
      
      <div className="p-6">
        {/* Project Header */}
        <div className="flex items-center mb-6 pb-4 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mr-4 p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-semibold mb-1">{project.name}</h1>
            <p className="text-sm text-muted-foreground">{project.address}</p>
          </div>
        </div>

        {/* Action Buttons - Single Press, No Modals */}
        <div className="flex gap-5 mb-8 justify-center">
          {/* Camera Button */}
          <button
            onClick={handleCameraClick}
            disabled={photoUploadMutation.isPending}
            className="w-16 h-16 rounded-full border-none cursor-pointer flex items-center justify-center transition-transform hover:scale-105 shadow-lg"
            style={{ background: aframeTheme.gradients.primary }}
            title="Take Photo"
          >
            <Camera size={28} color="white" />
          </button>

          {/* Receipt Scanner Button */}
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

        {/* Photo Thumbnails */}
        {photos.length > 0 && (
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Camera size={16} />
              <span className="font-medium">Photos ({photos.length})</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => openPhotoCarousel(index)}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary transition-all hover:scale-102"
                >
                  <img
                    src={`/api/uploads/photos/${photo.filename}`}
                    alt={photo.description || photo.originalName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Receipts Section */}
        {receipts.length > 0 && (
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <FileText size={16} />
              <span className="font-medium">Receipts ({receipts.length})</span>
            </div>
            <div className="space-y-2">
              {receipts.map(receipt => (
                <Card key={receipt.id} className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{receipt.vendor}</div>
                      <div className="text-xs text-muted-foreground">
                        ${receipt.amount.toFixed(2)} • {new Date(receipt.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <a
                      href={`/api/uploads/receipts/${receipt.filename}`}
                      download
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Download size={16} />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Notes Section - Large, Always Visible */}
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

        {/* Generate Invoice Button */}
        <Button
          onClick={() => generateInvoiceMutation.mutate()}
          disabled={generateInvoiceMutation.isPending}
          className="w-full py-4 text-base font-semibold"
          style={{ background: aframeTheme.gradients.destructive }}
        >
          {generateInvoiceMutation.isPending ? 'Generating...' : 'Generate Invoice'}
        </Button>
      </div>

      {/* Hidden File Inputs */}
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

      {/* Photo Carousel */}
      {showPhotoCarousel && photos.length > 0 && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPhotoCarousel(false)}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 text-white"
          >
            <X size={24} />
          </Button>
          
          <img
            src={`/api/uploads/photos/${photos[carouselIndex]?.filename}`}
            alt="Project Photo"
            className="max-w-[90%] max-h-[90%] object-contain rounded-lg"
          />
          
          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCarouselIndex(prev => prev > 0 ? prev - 1 : photos.length - 1)}
                className="absolute left-6 w-12 h-12 rounded-full bg-white/10 text-white text-2xl"
              >
                ‹
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCarouselIndex(prev => prev < photos.length - 1 ? prev + 1 : 0)}
                className="absolute right-6 w-12 h-12 rounded-full bg-white/10 text-white text-2xl"
              >
                ›
              </Button>
            </>
          )}
          
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
            {carouselIndex + 1} of {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}