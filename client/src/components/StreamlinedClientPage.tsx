import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, FileText, ArrowLeft, Edit3, Download, X, Image as ImageIcon, DollarSign, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import type { Project, Photo, Receipt } from '@shared/schema';
// Simple clean file list component
function SimpleFilesList({ projectId }: { projectId: number }) {
  const { data: receipts = [] } = useQuery<Receipt[]>({
    queryKey: ['/api/projects', projectId, 'receipts'],
  });

  if (receipts.length === 0) {
    return null; // Hide section if no files
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 text-muted-foreground">
        <FileText size={16} />
        <span className="font-medium">Files ({receipts.length})</span>
      </div>
      <div className="space-y-2">
        {receipts.map((receipt) => (
          <div key={receipt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {receipt.originalName || receipt.vendor}
              </span>
            </div>
            {receipt.filename && (
              <a
                href={`/uploads/${receipt.filename}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                View
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [touchStarted, setTouchStarted] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: [`/api/projects/${projectId}/photos`],
  });

  // Debug logging
  console.log('Photos data:', photos);
  console.log('Photos length:', photos.length);

  const { data: receipts = [] } = useQuery<Receipt[]>({
    queryKey: [`/api/projects/${projectId}/receipts`],
  });

  const photoUploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      console.log('Starting upload for', files.length, 'files');
      const formData = new FormData();
      Array.from(files).forEach((file, index) => {
        console.log(`Adding file ${index}:`, file.name, file.size, 'bytes');
        formData.append('photos', file);
      });
      
      console.log('FormData prepared, making request...');
      const response = await fetch(`/api/projects/${projectId}/photos`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed with status:', response.status, 'text:', errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Upload successful:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Photo upload successful:', data);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      // Force refetch
      queryClient.refetchQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
    },
    onError: (error) => {
      console.error('Photo upload failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      const response = await apiRequest('DELETE', `/api/projects/${projectId}/photos/${photoId}`);
      if (!response.ok) throw new Error('Failed to delete photo');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
    },
    onError: (error) => {
      console.error('Photo deletion failed:', error);
    }
  });

  const deleteSelectedPhotosMutation = useMutation({
    mutationFn: async (photoIds: number[]) => {
      const results = await Promise.allSettled(
        photoIds.map(id => 
          apiRequest('DELETE', `/api/projects/${projectId}/photos/${id}`)
        )
      );
      return results;
    },
    onSuccess: () => {
      // Clear selection state completely
      setSelectedPhotos(new Set());
      setIsSelecting(false);
      setTouchStarted(false);
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
    },
    onError: (error) => {
      console.error('Bulk photo deletion failed:', error);
    }
  });

  const receiptUploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      console.log('Upload mutation started with', files.length, 'files');
      
      if (!files || files.length === 0) {
        throw new Error('No files to upload');
      }
      
      const results = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Starting upload for ${file.name} (${file.type})`);
        
        const formData = new FormData();
        formData.append('receipt', file);
        formData.append('vendor', file.name);
        formData.append('amount', '0');
        formData.append('description', `File upload: ${file.name}`);
        formData.append('date', new Date().toISOString().split('T')[0]);
        
        console.log('FormData prepared, making request to:', `/api/projects/${projectId}/receipts`);
        
        const response = await fetch(`/api/projects/${projectId}/receipts`, {
          method: 'POST',
          body: formData
        });
        
        console.log(`Upload response for ${file.name}:`, response.status, response.statusText);
        const responseText = await response.text();
        console.log('Response body:', responseText);
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}: ${response.status} ${responseText}`);
        }
        
        const result = JSON.parse(responseText);
        results.push(result);
        console.log('File uploaded successfully:', result);
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'receipts'] });
    },
    onError: (error) => {
      console.error('Receipt upload failed:', error);
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



  const handleReceiptClick = () => {
    receiptInputRef.current?.click();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed:', e.target.files?.length, 'files');
    if (e.target.files && e.target.files.length > 0) {
      // Convert FileList to File array immediately to prevent it from becoming empty
      const filesArray = Array.from(e.target.files);
      console.log('Files captured:', filesArray.length, 'files');
      console.log('Starting photo upload...');
      
      // Create a new FileList-like object that won't become empty
      const fileListObj = {
        ...filesArray,
        length: filesArray.length,
        item: (index: number) => filesArray[index] || null,
        [Symbol.iterator]: function* () {
          for (const file of filesArray) {
            yield file;
          }
        }
      } as FileList;
      
      photoUploadMutation.mutate(fileListObj);
      e.target.value = ''; // Reset input to allow re-uploading same files
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Receipt upload triggered:', e.target.files?.length, 'files');
    if (e.target.files && e.target.files.length > 0) {
      // Convert FileList to File array immediately to prevent it from becoming empty
      const filesArray = Array.from(e.target.files);
      console.log('Files selected for receipt upload:', filesArray.map(f => `${f.name} (${f.type})`));
      console.log('Files captured:', filesArray.length, 'files');
      
      // Create a new FileList-like object that won't become empty
      const fileListObj = {
        ...filesArray,
        length: filesArray.length,
        item: (index: number) => filesArray[index] || null,
        [Symbol.iterator]: function* () {
          for (const file of filesArray) {
            yield file;
          }
        }
      } as FileList;
      
      receiptUploadMutation.mutate(fileListObj);
      e.target.value = '';
    }
  };

  const handleNotesBlur = () => {
    if (notes !== project?.notes) {
      updateNotesMutation.mutate(notes);
    }
  };

  const handlePhotoTouchStart = (photoId: number, e: React.TouchEvent | React.MouseEvent) => {
    // Clear any existing timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    
    setTouchStarted(true);
    
    // Set a timer for long press detection (500ms)
    const timer = setTimeout(() => {
      e.preventDefault();
      e.stopPropagation();
      setIsSelecting(true);
      setSelectedPhotos(new Set([photoId]));
    }, 500);
    
    setLongPressTimer(timer);
  };

  const handlePhotoTouchMove = (photoId: number, e: React.TouchEvent | React.MouseEvent) => {
    if (!isSelecting || !touchStarted) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Add photo to selection if not already selected
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      newSet.add(photoId);
      return newSet;
    });
  };

  const handlePhotoTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    // Clear the long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    setTouchStarted(false);
    
    // If we weren't in selection mode, this was just a tap
    if (!isSelecting) {
      // Let the click event handle opening carousel
      return;
    }
  };

  const togglePhotoSelection = (photoId: number) => {
    setSelectedPhotos(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(photoId)) {
        newSelection.delete(photoId);
      } else {
        newSelection.add(photoId);
      }
      return newSelection;
    });
  };

  const clearSelection = () => {
    setSelectedPhotos(new Set());
    setIsSelecting(false);
    setTouchStarted(false);
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const deleteSelectedPhotos = () => {
    if (selectedPhotos.size > 0) {
      deleteSelectedPhotosMutation.mutate(Array.from(selectedPhotos));
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
          <div className="flex flex-col items-center">
            <label
              className="w-16 h-16 rounded-full border-none cursor-pointer flex items-center justify-center transition-transform hover:scale-105 shadow-lg"
              style={{ backgroundColor: '#EA580C' }}
              title="Photos"
            >
              <Camera size={28} color="white" />
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.heif"
                onChange={handlePhotoUpload}
                multiple
                className="hidden"
              />
            </label>
            <span className="text-xs text-center mt-2 text-muted-foreground">Photos</span>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={handleReceiptClick}
              disabled={receiptUploadMutation.isPending}
              className="w-16 h-16 rounded-full border-none cursor-pointer flex items-center justify-center transition-transform hover:scale-105 shadow-lg"
              style={{ backgroundColor: '#1E40AF' }}
              title="Files"
            >
              <FileText size={28} color="white" />
            </button>
            <span className="text-xs text-center mt-2 text-muted-foreground">Files</span>
          </div>
        </div>

        {/* Debug info - temporary */}
        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <p>Debug: Photos array has {photos.length} items</p>
          {photos.length > 0 && (
            <p>First photo: {photos[0].filename}</p>
          )}
        </div>

        {/* Selection Toolbar */}
        {selectedPhotos.size > 0 && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                onClick={clearSelection}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
              <Button
                onClick={deleteSelectedPhotos}
                disabled={deleteSelectedPhotosMutation.isPending}
                variant="destructive"
                size="sm"
              >
                {deleteSelectedPhotosMutation.isPending ? 'Deleting...' : 'Delete Selected'}
              </Button>
            </div>
          </div>
        )}

        {/* Photo Thumbnails Grid */}
        {photos.length > 0 && (
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Camera size={16} />
              <span className="font-medium">Photos ({photos.length})</span>
              {selectedPhotos.size === 0 && !isSelecting && (
                <span className="text-xs text-muted-foreground ml-2">
                  Long press and drag to select multiple
                </span>
              )}
              {isSelecting && selectedPhotos.size === 0 && (
                <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                  Selection mode active - tap photos to select
                </span>
              )}
            </div>
            <div 
              className="grid grid-cols-3 gap-3"
              onTouchEnd={(e) => handlePhotoTouchEnd(e)}
              onMouseUp={(e) => handlePhotoTouchEnd(e)}
            >
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all relative group ${
                    selectedPhotos.has(photo.id) 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-transparent hover:border-blue-500'
                  }`}
                  onTouchStart={(e) => handlePhotoTouchStart(photo.id, e)}
                  onMouseDown={(e) => handlePhotoTouchStart(photo.id, e)}
                  onTouchMove={(e) => handlePhotoTouchMove(photo.id, e)}
                  onMouseEnter={(e) => touchStarted && handlePhotoTouchMove(photo.id, e)}
                  onClick={(e) => {
                    if (isSelecting) {
                      e.preventDefault();
                      e.stopPropagation();
                      togglePhotoSelection(photo.id);
                    } else {
                      openPhotoCarousel(index);
                    }
                  }}
                >
                  <img
                    src={`/uploads/${photo.filename}`}
                    alt={photo.description || photo.originalName}
                    className={`w-full h-full object-cover ${selectedPhotos.has(photo.id) ? 'opacity-80' : ''}`}
                    draggable={false}
                    onError={(e) => console.error('Image failed to load:', photo.filename)}
                    onLoad={() => console.log('Image loaded successfully:', photo.filename)}
                  />
                  
                  {/* Selection Indicator */}
                  {selectedPhotos.has(photo.id) && (
                    <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                  
                  {/* Individual Delete Button (hidden during selection) */}
                  {!isSelecting && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePhotoMutation.mutate(photo.id);
                      }}
                      disabled={deletePhotoMutation.isPending}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      title="Delete photo"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show if no photos */}
        {photos.length === 0 && (
          <div className="mb-7 p-4 text-center text-muted-foreground">
            <Camera size={24} className="mx-auto mb-2" />
            <p>No photos yet. Use the camera button to add some!</p>
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

        {/* Simple Files List */}
        <SimpleFilesList projectId={project.id} />

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
        ref={receiptInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
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
            src={`/uploads/${photos[carouselIndex]?.filename}`}
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