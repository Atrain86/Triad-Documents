import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, FileText, ArrowLeft, Edit3, Download, X, Image as ImageIcon, DollarSign, Calendar, Wrench, Plus, Trash2, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import type { Project, Photo, Receipt, ToolsChecklist, DailyHours } from '@shared/schema';
import InvoiceGenerator from './InvoiceGenerator';
import EstimateGenerator from './EstimateGenerator';
// Improved file list component inspired by the PDF uploader
function SimpleFilesList({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const { data: receipts = [], isLoading, error } = useQuery<Receipt[]>({
    queryKey: [`/api/projects/${projectId}/receipts`],
  });

  const deleteReceiptMutation = useMutation({
    mutationFn: async (receiptId: number) => {
      const response = await fetch(`/api/receipts/${receiptId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status}`);
      }
      
      return receiptId; // Return the ID for optimistic updates
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/receipts`] });
    },
    onError: (error) => {
      console.error('Delete failed:', error);
    },
  });

  if (isLoading) {
    return <div className="mb-8 text-center text-gray-500">Loading files...</div>;
  }

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
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {receipt.originalName || receipt.vendor}
                </div>
                <div className="text-xs text-gray-500">
                  {receipt.description}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {receipt.filename && (
                <a
                  href={`/uploads/${receipt.filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm px-3 py-1 rounded bg-blue-50 dark:bg-blue-900/20"
                >
                  View
                </a>
              )}
              <button
                onClick={() => deleteReceiptMutation.mutate(receipt.id)}
                disabled={deleteReceiptMutation.isPending}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                title="Delete file"
              >
                <Trash2 size={16} />
              </button>
            </div>
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
  const [newTool, setNewTool] = useState('');
  const [showStatusSelect, setShowStatusSelect] = useState(false);
  const [showPhotoCarousel, setShowPhotoCarousel] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [touchStarted, setTouchStarted] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [showEstimateGenerator, setShowEstimateGenerator] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [hoursInput, setHoursInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  
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

  const { data: tools = [] } = useQuery<ToolsChecklist[]>({
    queryKey: [`/api/projects/${projectId}/tools`],
  });

  const { data: dailyHours = [] } = useQuery<DailyHours[]>({
    queryKey: [`/api/projects/${projectId}/hours`],
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
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/receipts`] });
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

  const addToolMutation = useMutation({
    mutationFn: async (toolName: string) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/tools`, { toolName });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tools`] });
      setNewTool('');
    }
  });

  const toggleToolMutation = useMutation({
    mutationFn: async (toolId: number) => {
      // Instead of toggling, we delete the tool when checked
      const response = await apiRequest('DELETE', `/api/tools/${toolId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tools`] });
    }
  });

  const addHoursMutation = useMutation({
    mutationFn: async (hoursData: { date: string; hours: number; description: string; hourlyRate: number }) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/hours`, {
        ...hoursData,
        projectId: Number(projectId)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/hours`] });
      setSelectedDate('');
      setHoursInput('');
      setDescriptionInput('');
      setShowDatePicker(false);
    }
  });

  const deleteHoursMutation = useMutation({
    mutationFn: async (hoursId: number) => {
      const response = await apiRequest('DELETE', `/api/hours/${hoursId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/hours`] });
    }
  });

  // Helper functions for date handling
  const formatDate = (date: Date | string) => {
    let dateObj: Date;
    if (typeof date === 'string') {
      // Parse UTC date string as local date to avoid timezone conversion
      if (date.includes('T')) {
        // If it's an ISO string like "2025-06-21T00:00:00.000Z"
        const datePart = date.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
        console.log('Parsing ISO date:', date, '-> datePart:', datePart, '-> final date:', dateObj.toLocaleDateString());
      } else {
        // If it's just a date string like "2025-06-21"
        const [year, month, day] = date.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
        console.log('Parsing simple date:', date, '-> final date:', dateObj.toLocaleDateString());
      }
    } else {
      dateObj = date;
      console.log('Using Date object:', dateObj.toLocaleDateString());
    }
    
    const formatted = dateObj.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    console.log('Final formatted date:', formatted);
    return formatted;
  };

  const formatDateForInput = (date: Date) => {
    // Use local date to avoid timezone offset issues
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleAddHours = () => {
    if (selectedDate && hoursInput && !isNaN(parseFloat(hoursInput))) {
      // Ensure the date is sent as YYYY-MM-DD format without timezone conversion
      const formattedDate = selectedDate;
      console.log('Adding hours for date:', formattedDate, 'hours:', hoursInput);
      
      addHoursMutation.mutate({
        date: formattedDate,
        hours: parseFloat(hoursInput),
        description: descriptionInput || 'Work performed',
        hourlyRate: project?.hourlyRate || 60 // Default to $60/hour
      });
    }
  };



  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      console.log('Sending status update:', status, 'for project:', projectId);
      const response = await apiRequest('PUT', `/api/projects/${projectId}`, { status });
      const result = await response.json();
      console.log('Status update response:', result);
      return result;
    },
    onSuccess: () => {
      console.log('Status update successful');
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      setShowStatusSelect(false);
    },
    onError: (error) => {
      console.error('Status update failed:', error);
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: async (updates: Partial<Project>) => {
      const response = await apiRequest('PUT', `/api/projects/${projectId}`, updates);
      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      setShowEditClient(false);
    },
    onError: (error) => {
      console.error('Client update failed:', error);
    }
  });

  const handleEditInputChange = (field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveClient = () => {
    updateClientMutation.mutate(editForm);
  };



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

  // Close status dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showStatusSelect && !target.closest('.status-dropdown')) {
        setShowStatusSelect(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusSelect]);

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
        <div className="flex items-center mb-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mr-4 p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold mb-1 text-blue-600 dark:text-blue-400">{project.clientName || project.address || 'New Project'}</h1>
              <button
                onClick={() => {
                  setEditForm({
                    clientName: project.clientName,
                    address: project.address,
                    clientEmail: project.clientEmail,
                    clientPhone: project.clientPhone,
                    projectType: project.projectType,
                    roomCount: project.roomCount,
                    difficulty: project.difficulty,
                    hourlyRate: project.hourlyRate
                  });
                  setShowEditClient(true);
                }}
                className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded transition-colors"
                title="Edit client information"
              >
                <Edit3 size={16} />
              </button>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400">{project.address}</p>
          </div>
        </div>

        {/* Status Selector - positioned right above the horizontal line */}
        <div className="flex justify-end mb-2">
          <div className="relative status-dropdown">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusSelect(!showStatusSelect);
              }}
              className={`text-sm px-3 py-1 rounded-md transition-colors ${
                project.status === 'in-progress' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' :
                project.status === 'pending' ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                project.status === 'completed' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                project.status === 'archived' ? 'text-gray-600 bg-gray-50 dark:bg-gray-900/20' :
                'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
              } hover:opacity-80`}
            >
              {project.status === 'in-progress' ? 'In Progress' :
               project.status === 'pending' ? 'Pending' :
               project.status === 'completed' ? 'Completed' :
               project.status === 'archived' ? 'Archived' :
               'Status'} ▼
            </button>

            {/* Status Dropdown */}
            {showStatusSelect && (
              <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 min-w-[120px]">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Updating status to: in-progress');
                    updateStatusMutation.mutate('in-progress');
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-b border-gray-100 dark:border-gray-600"
                >
                  🔴 In Progress
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Updating status to: pending');
                    updateStatusMutation.mutate('pending');
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="w-full text-left px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors border-b border-gray-100 dark:border-gray-600"
                >
                  🟡 Pending
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Updating status to: completed');
                    updateStatusMutation.mutate('completed');
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors border-b border-gray-100 dark:border-gray-600"
                >
                  🟢 Completed
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Updating status to: archived');
                    updateStatusMutation.mutate('archived');
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors"
                >
                  📁 Archived
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Horizontal divider line */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6"></div>

        {/* Upload Controls */}
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

        {/* Tools Checklist Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Wrench size={16} />
            <span className="font-medium">Tools Checklist</span>
          </div>
          
          {/* Add Tool Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTool}
              onChange={(e) => setNewTool(e.target.value)}
              placeholder="Paint brushes, Drop cloths, Ladder, Rollers..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-background"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTool.trim()) {
                  addToolMutation.mutate(newTool.trim());
                }
              }}
            />
            <Button
              onClick={() => newTool.trim() && addToolMutation.mutate(newTool.trim())}
              disabled={!newTool.trim() || addToolMutation.isPending}
              size="sm"
              className="px-3"
            >
              <Plus size={16} />
            </Button>
          </div>

          {/* Tools List */}
          <div className="h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
            {tools.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No tools added yet. Add tools you need to bring to this job.
              </p>
            ) : (
              tools.map((tool) => (
                <div key={tool.id} className="flex items-center gap-3 group">
                  <button
                    onClick={() => toggleToolMutation.mutate(tool.id)}
                    className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors border-gray-300 dark:border-gray-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                    title="Click to mark as complete and remove from list"
                  >
                    {/* Empty checkbox - clicking it will delete the tool */}
                  </button>
                  <span className="flex-1 text-sm text-foreground">
                    {tool.toolName}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Daily Hours Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Calendar size={16} />
            <span className="font-medium">Daily Hours</span>
          </div>
          
          {/* Add Hours Button */}
          {!showDatePicker && (
            <Button
              onClick={() => setShowDatePicker(true)}
              className="w-full mb-4 py-2 text-sm"
              variant="outline"
            >
              <Plus size={16} className="mr-2" />
              Log Hours for a Day
            </Button>
          )}

          {/* Date Picker and Hours Input */}
          {showDatePicker && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Date
                  <span className="ml-2 text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 rounded">
                    Today: {formatDateForInput(new Date())}
                  </span>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800"
                  max={formatDateForInput(new Date())}
                  style={{
                    colorScheme: 'light'
                  }}
                />
              </div>
              
              {selectedDate && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Hours Worked</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={hoursInput}
                      onChange={(e) => setHoursInput(e.target.value)}
                      placeholder="8.0"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-background"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                    <input
                      type="text"
                      value={descriptionInput}
                      onChange={(e) => setDescriptionInput(e.target.value)}
                      placeholder="Painting living room, prep work..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-background"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddHours}
                      disabled={!hoursInput || addHoursMutation.isPending}
                      className="flex-1"
                    >
                      {addHoursMutation.isPending ? 'Adding...' : 'Add Hours'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowDatePicker(false);
                        setSelectedDate('');
                        setHoursInput('');
                        setDescriptionInput('');
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Hours Dashboard */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            {/* Compact Hours List */}
            <div className="h-48 overflow-y-auto mb-4">
              {dailyHours.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hours logged yet. Click "Log Hours for a Day" to start tracking.
                </p>
              ) : (
                dailyHours.map((hours) => (
                  <div key={hours.id} className="flex items-center justify-between py-0.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded text-sm">
                    <div className="flex-1">
                      <span className="font-medium">
                        {new Date(hours.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short',
                          day: 'numeric'
                        })} - {hours.hours}hr
                      </span>
                      {hours.description && hours.description !== 'Work performed' && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({hours.description})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        ${(hours.hours * 60).toFixed(0)}
                      </span>
                      <button
                        onClick={() => deleteHoursMutation.mutate(hours.id)}
                        disabled={deleteHoursMutation.isPending}
                        className="p-0.5 text-red-500 hover:text-red-700 transition-colors opacity-60 hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Hours Summary at Bottom */}
            {dailyHours.length > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">
                  ${60}/hr
                </div>
                <div className="pt-2 border-t border-green-200 dark:border-green-700">
                  <div className="font-semibold text-green-700 dark:text-green-300">
                    Total Hours: {dailyHours.reduce((sum, h) => sum + h.hours, 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    Total Earned: ${(dailyHours.reduce((sum, h) => sum + (h.hours * 60), 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Edit3 size={16} />
            <span className="font-medium">Project Notes</span>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add project notes, client preferences, or special instructions..."
            className="w-full min-h-96 resize-none rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm"
          />
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



        {/* Simple Files List */}
        {/* Quick Receipt Entry Form */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 text-muted-foreground">
            <DollarSign size={16} />
            <span className="font-medium">Add Receipt Amount</span>
          </div>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const item = formData.get('item') as string;
              const price = formData.get('price') as string;
              
              if (!item.trim() || !price.trim()) return;
              
              const receiptData = {
                vendor: item,
                amount: price,
                description: `Manual entry: ${item}`,
                filename: null
              };
              
              fetch(`/api/projects/${project.id}/receipts`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(receiptData),
              }).then(() => {
                queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/receipts`] });
                (e.target as HTMLFormElement).reset();
              });
            }}
            className="flex gap-2"
          >
            <Input
              name="item"
              placeholder="Item (e.g., Paint brushes)"
              className="flex-1 h-9"
            />
            <Input
              name="price"
              type="number"
              step="0.01"
              placeholder="$0.00"
              className="w-24 h-9"
            />
            <Button 
              type="submit" 
              size="sm"
              className="h-9 px-3 text-xs"
            >
              Add
            </Button>
          </form>
        </div>

        <SimpleFilesList projectId={project.id} />

        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => setShowEstimateGenerator(true)}
            className="py-4 text-base font-semibold bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Calculator size={20} className="mr-2" />
            Generate Estimate
          </Button>
          <Button
            onClick={() => setShowInvoiceGenerator(true)}
            className="py-4 text-base font-semibold"
            style={{ background: aframeTheme.gradients.destructive }}
          >
            <FileText size={20} className="mr-2" />
            Generate Invoice
          </Button>
        </div>
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

      {/* Invoice Generator */}
      {project && (
        <InvoiceGenerator
          project={project}
          dailyHours={dailyHours}
          receipts={receipts}
          isOpen={showInvoiceGenerator}
          onClose={() => setShowInvoiceGenerator(false)}
        />
      )}

      {/* Estimate Generator */}
      {project && (
        <EstimateGenerator
          project={project}
          isOpen={showEstimateGenerator}
          onClose={() => setShowEstimateGenerator(false)}
        />
      )}

      {/* Edit Client Dialog */}
      <Dialog open={showEditClient} onOpenChange={setShowEditClient}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Client Information</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Client Name</label>
              <Input
                value={editForm.clientName || ''}
                onChange={(e) => handleEditInputChange('clientName', e.target.value)}
                placeholder="Enter client name"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Address</label>
              <Input
                value={editForm.address || ''}
                onChange={(e) => handleEditInputChange('address', e.target.value)}
                placeholder="Enter project address"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Email Address</label>
                <Input
                  type="email"
                  value={editForm.clientEmail || ''}
                  onChange={(e) => handleEditInputChange('clientEmail', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Phone Number</label>
                <Input
                  type="tel"
                  value={editForm.clientPhone || ''}
                  onChange={(e) => handleEditInputChange('clientPhone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Project Type</label>
              <select
                value={editForm.projectType || 'exterior'}
                onChange={(e) => handleEditInputChange('projectType', e.target.value)}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="exterior">Exterior</option>
                <option value="interior">Interior</option>
                <option value="both">Both</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Room Count</label>
                <Input
                  type="number"
                  value={editForm.roomCount || 1}
                  onChange={(e) => handleEditInputChange('roomCount', parseInt(e.target.value))}
                  min="1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Hourly Rate</label>
                <Input
                  type="number"
                  value={editForm.hourlyRate || 60}
                  onChange={(e) => handleEditInputChange('hourlyRate', parseInt(e.target.value))}
                  min="1"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Difficulty</label>
              <select
                value={editForm.difficulty || 'medium'}
                onChange={(e) => handleEditInputChange('difficulty', e.target.value)}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowEditClient(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveClient}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                disabled={updateClientMutation.isPending}
              >
                {updateClientMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}