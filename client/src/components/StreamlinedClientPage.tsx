import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Camera, FileText, ArrowLeft, Edit3, Download, X, Image as ImageIcon, DollarSign, Calendar, Wrench, Plus, Trash2, Calculator, Receipt as ReceiptIcon, MapPin, Navigation, ExternalLink, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { generateMapsLink, generateDirectionsLink } from '@/lib/maps';
import { compressMultipleImages, formatFileSize } from '@/lib/imageCompression';
import type { Project, Photo, Receipt, ToolsChecklist, DailyHours } from '@shared/schema';
import InvoiceGenerator from './InvoiceGenerator';
import EstimateGenerator from './EstimateGenerator';
import PhotoCarousel from './PhotoCarousel';
import { ReactSortable } from 'react-sortablejs';

// Paint Brain Color Palette
const paintBrainColors = {
  purple: '#8B5FBF',
  orange: '#D4A574',  
  green: '#6A9955',
  red: '#E53E3E',      // Vibrant red for photo gallery
  blue: '#3182CE',     // Rich blue for project notes
  yellow: '#ECC94B',   // Bright yellow for tools
  gray: '#6B7280'
};

// Calendar function for A-Frame calendar integration
const openWorkCalendar = (clientProject: Project | null = null) => {
  const aframeCalendarOnlyUrl = 'https://calendar.google.com/calendar/embed?src=6b990af5658408422c42677572f2ef19740096a1608165f15f59135db4f2a981%40group.calendar.google.com&ctz=America%2FVancouver&mode=WEEK&showTitle=1&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0&bgcolor=%23000000&color=%23ffffff';
  
  if (clientProject) {
    const eventTitle = `${clientProject.clientName} - ${clientProject.projectType}`;
    const eventLocation = `${clientProject.address}, ${clientProject.clientCity || ''}`;
    
    const createEventUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&location=${encodeURIComponent(eventLocation)}&details=${encodeURIComponent(`Client: ${clientProject.clientName}\nProject: ${clientProject.projectType}`)}&cid=6b990af5658408422c42677572f2ef19740096a1608165f15f59135db4f2a981@group.calendar.google.com`;
    
    window.open(createEventUrl, '_blank');
  } else {
    // Open ONLY the A-Frame work calendar (isolated view with dark mode)
    // This direct URL shows just the A-Frame calendar without your other calendars
    const workCalendarDirectUrl = 'https://calendar.google.com/calendar/u/0?cid=NmI5OTBhZjU2NTg0MDg0MjJjNDI2Nzc1NzJmMmVmMTk3NDAwOTZhMTYwODE2NWYxNWY1OTEzNWRiNGYyYTk4MUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%23039BE5&bgcolor=%23000000';
    window.open(workCalendarDirectUrl, '_blank');
  }
};

// Improved file list component
function SimpleFilesList({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [editVendor, setEditVendor] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Format ISO date string into "DD–MM–YYYY" with em-dash - CLEAN DATE ONLY
  const formatDate = (isoDate: string | null | undefined) => {
    if (!isoDate) return '';
    
    // Convert to string in case it's not already
    const dateStr = String(isoDate);
    
    // Extract only the date part (YYYY-MM-DD) from ISO string
    let cleanDateString = '';
    if (dateStr.includes('T')) {
      // If it's a full ISO string like "2025-06-22T00:00:00.000Z"
      cleanDateString = dateStr.split('T')[0];
    } else if (dateStr.includes(' ')) {
      // If it's a string with space separator
      cleanDateString = dateStr.split(' ')[0];
    } else {
      // If it's already just a date string
      cleanDateString = dateStr;
    }
    
    // Parse the clean date string (YYYY-MM-DD format)
    const parts = cleanDateString.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      return `${day}–${month}–${year}`;
    }
    
    // If parsing fails, return empty string instead of the raw date
    return '';
  };

  const { data: receipts = [], isLoading, error } = useQuery<Receipt[]>({
    queryKey: [`/api/projects/${projectId}/receipts`],
  });

  const deleteReceiptMutation = useMutation({
    mutationFn: async (receiptId: number) => {
      await apiRequest(`/api/receipts/${receiptId}`, {
        method: 'DELETE',
      });
      
      return receiptId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/receipts`] });
    },
    onError: (error) => {
      console.error('Delete failed:', error);
    },
  });

  const updateReceiptMutation = useMutation({
    mutationFn: async ({ id, vendor, amount, description }: { id: number; vendor: string; amount: string; description: string }) => {
      const response = await apiRequest(`/api/receipts/${id}`, {
        method: 'PUT',
        body: { vendor, amount, description },
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/receipts`] });
      setEditingReceipt(null);
      setEditVendor('');
      setEditAmount('');
      setEditDescription('');
    },
    onError: (error) => {
      console.error('Update failed:', error);
    },
  });

  const startEditing = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setEditVendor(receipt.vendor);
    setEditAmount(receipt.amount.toString());
    setEditDescription(receipt.description || '');
  };

  const handleSave = () => {
    if (editingReceipt) {
      updateReceiptMutation.mutate({
        id: editingReceipt.id,
        vendor: editVendor,
        amount: editAmount,
        description: editDescription
      });
    }
  };

  const handleCancel = () => {
    setEditingReceipt(null);
    setEditVendor('');
    setEditAmount('');
    setEditDescription('');
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        Loading files...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Failed to load files. Please try again.
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        <ReceiptIcon size={24} className="mx-auto mb-2" />
        <p>No receipts uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {receipts.map((receipt) => (
        <div key={receipt.id} className="p-3 bg-gray-800 rounded-lg border border-gray-600">
          {editingReceipt?.id === receipt.id ? (
            // Edit mode
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-200">Vendor</label>
                <Input
                  value={editVendor}
                  onChange={(e) => setEditVendor(e.target.value)}
                  className="w-full bg-gray-700 border-gray-600 text-gray-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-200">Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full bg-gray-700 border-gray-600 text-gray-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-gray-200">Description</label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-gray-700 border-gray-600 text-gray-200"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={updateReceiptMutation.isPending}
                  className="flex-1 text-white border-0 px-3 py-2 text-sm rounded-md font-medium disabled:opacity-50"
                  style={{ backgroundColor: '#6A9955', borderColor: '#6A9955', border: 'none' }}
                >
                  {updateReceiptMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            // View mode
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {receipt.filename ? (
                    <button
                      onClick={() => window.open(`/uploads/${receipt.filename}`, '_blank')}
                      className="text-blue-400 hover:text-blue-300 underline text-sm"
                    >
                      {receipt.vendor} - ${typeof receipt.amount === 'number' ? receipt.amount.toFixed(2) : parseFloat(receipt.amount || '0').toFixed(2)}
                    </button>
                  ) : (
                    <span className="text-gray-200 text-sm">
                      {receipt.vendor} - ${typeof receipt.amount === 'number' ? receipt.amount.toFixed(2) : parseFloat(receipt.amount || '0').toFixed(2)}
                    </span>
                  )}
                </div>
                {receipt.description && receipt.description.trim() && (
                  <p className="text-xs text-gray-400 mt-1">{receipt.description}</p>
                )}
                {receipt.date && (
                  <p className="text-xs" style={{ color: paintBrainColors.orange }}>{formatDate(receipt.date)}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEditing(receipt)}
                  className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                  title="Edit"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => deleteReceiptMutation.mutate(receipt.id)}
                  disabled={deleteReceiptMutation.isPending}
                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface StreamlinedClientPageProps {
  projectId: number;
  onBack: () => void;
}

export default function StreamlinedClientPage({ projectId, onBack }: StreamlinedClientPageProps) {
  // File input refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  
  // QueryClient for cache management
  const queryClient = useQueryClient();

  // State management
  const [showPhotoCarousel, setShowPhotoCarousel] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [showEstimateGenerator, setShowEstimateGenerator] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Photo selection states
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [touchStarted, setTouchStarted] = useState(false);

  // Menu customization states
  const [menuSections, setMenuSections] = useState([
    { id: 'photos', name: 'Photos', icon: Camera },
    { id: 'tools', name: 'Tools', icon: Wrench },
    { id: 'dailyHours', name: 'Daily Hours', icon: Calendar },
    { id: 'notes', name: 'Project Notes', icon: FileText },
    { id: 'receipts', name: 'Receipts & Expenses', icon: ReceiptIcon },
  ]);

  // Collapsible menu state - all collapsed by default
  const [expandedSections, setExpandedSections] = useState({
    photos: false,
    tools: false,
    dailyHours: false,
    notes: false,
    receipts: false,
  });

  // Tools state
  const [newTool, setNewTool] = useState('');

  // Hours tracking state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [hoursInput, setHoursInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');

  // Edit form state
  const [editForm, setEditForm] = useState({
    clientName: '',
    address: '',
    clientCity: '',
    clientPostal: '',
    clientEmail: '',
    clientPhone: '',
    projectType: '',
    roomCount: 0,
    hourlyRate: 0,
  });

  // File upload state
  const [compressionProgress, setCompressionProgress] = useState({
    isCompressing: false,
    currentFile: 0,
    totalFiles: 0,
    originalSize: 0,
    compressedSize: 0,
  });

  // ⚠️ FIX: State variable for temporal dead zone error
  const [totalCompressedSizeBytes, setTotalCompressedSizeBytes] = useState(0);

  // API queries
  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: [`/api/projects/${projectId}/photos`],
  });

  // Debug logging for photos
  React.useEffect(() => {
    console.log('Photos data updated:', photos);
    console.log('Photos length:', photos.length);
    console.log('Photos array:', photos.map(p => ({ id: p.id, filename: p.filename })));
  }, [photos]);

  const { data: receipts = [] } = useQuery<Receipt[]>({
    queryKey: [`/api/projects/${projectId}/receipts`],
  });

  const { data: tools = [] } = useQuery<ToolsChecklist[]>({
    queryKey: [`/api/projects/${projectId}/tools`],
  });

  const { data: dailyHours = [] } = useQuery<DailyHours[]>({
    queryKey: [`/api/projects/${projectId}/hours`],
  });

  // Critical mutations that need to be declared early
  const editProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const response = await apiRequest(`/api/projects/${projectId}`, {
        method: 'PUT',
        body: projectData,
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      setShowEditClient(false);
    },
    onError: (error) => {
      console.error('Edit project failed:', error);
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest(`/api/projects/${projectId}`, {
        method: 'PUT',
        body: updates,
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    },
    onError: (error) => {
      console.error('Update project failed:', error);
    },
  });

  const addHoursMutation = useMutation({
    mutationFn: async (hoursData: {
      projectId: number;
      date: string;
      hours: number;
      description: string;
    }) => {
      const response = await apiRequest(`/api/projects/${projectId}/hours`, {
        method: 'POST',
        body: {
          date: hoursData.date,
          hours: hoursData.hours,
          description: hoursData.description,
          hourlyRate: project?.hourlyRate || 60, // Include hourlyRate from project
        },
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/hours`] });
      setShowDatePicker(false);
      setSelectedDate('');
      setHoursInput('');
      setDescriptionInput('');
    },
    onError: (error) => {
      console.error('Add hours failed:', error);
    },
  });

  // Helper functions
  const clearSelection = () => {
    setSelectedPhotos(new Set());
    setIsSelecting(false);
  };

  const deleteSelectedPhotosMutation = useMutation({
    mutationFn: async (photoIds: number[]) => {
      const deletePromises = photoIds.map(id => 
        apiRequest(`/api/projects/${projectId}/photos/${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      
      return photoIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      queryClient.refetchQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      clearSelection();
    },
    onError: (error) => {
      console.error('Bulk delete failed:', error);
    },
  });

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format ISO date string into "DD–MM–YYYY" with em-dash - CLEAN DATE ONLY
  const formatDate = (isoDate: string | null | undefined) => {
    if (!isoDate) return '';
    
    // Convert to string in case it's not already
    const dateStr = String(isoDate);
    
    // Extract only the date part (YYYY-MM-DD) from ISO string
    let cleanDateString = '';
    if (dateStr.includes('T')) {
      // If it's a full ISO string like "2025-06-22T00:00:00.000Z"
      cleanDateString = dateStr.split('T')[0];
    } else if (dateStr.includes(' ')) {
      // If it's a string with space separator
      cleanDateString = dateStr.split(' ')[0];
    } else {
      // If it's already just a date string
      cleanDateString = dateStr;
    }
    
    // Parse the clean date string (YYYY-MM-DD format)
    const parts = cleanDateString.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      return `${day}–${month}–${year}`;
    }
    
    // If parsing fails, return empty string instead of the raw date
    return '';
  };

  const handleAddHours = () => {
    if (!selectedDate || !hoursInput) return;
    
    const parsedHours = parseFloat(hoursInput);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      console.error('Invalid hours input:', hoursInput);
      return;
    }
    
    addHoursMutation.mutate({
      projectId,
      date: selectedDate,
      hours: parsedHours,
      description: descriptionInput.trim() || 'Painting',
    });
  };

  const handleNotesBlur = () => {
    if (project && notes !== project.notes) {
      updateProjectMutation.mutate({
        id: project.id,
        notes: notes,
      });
    }
  };

  // Set initial notes when project loads
  React.useEffect(() => {
    if (project && notes !== project.notes) {
      setNotes(project.notes || '');
    }
  }, [project]);

  // Set initial edit form values
  React.useEffect(() => {
    if (project) {
      setEditForm({
        clientName: project.clientName || '',
        address: project.address || '',
        clientCity: project.clientCity || '',
        clientPostal: project.clientPostal || '',
        clientEmail: project.clientEmail || '',
        clientPhone: project.clientPhone || '',
        projectType: project.projectType || '',
        roomCount: project.roomCount || 0,
        hourlyRate: project.hourlyRate || 0,
      });
    }
  }, [project]);

  const handleEditInputChange = (field: string, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = () => {
    editProjectMutation.mutate(editForm);
  };

  // Photo selection functions
  const togglePhotoSelection = (photoId: number) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      
      if (newSet.size === 0) {
        setIsSelecting(false);
      }
      
      return newSet;
    });
  };

  const deleteSelectedPhotos = () => {
    deleteSelectedPhotosMutation.mutate(Array.from(selectedPhotos));
  };

  const handlePhotoTouchStart = (photoId: number, e: React.TouchEvent | React.MouseEvent) => {
    if (isSelecting) return;
    
    setTouchStarted(true);
    const timer = setTimeout(() => {
      setIsSelecting(true);
      togglePhotoSelection(photoId);
    }, 500);
    setLongPressTimer(timer);
  };

  const handlePhotoTouchMove = (photoId: number, e: React.TouchEvent | React.MouseEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handlePhotoTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    setTouchStarted(false);
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const openPhotoCarousel = (index: number) => {
    setCarouselIndex(index);
    setShowPhotoCarousel(true);
  };

  // Collapsible menu functions
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId as keyof typeof prev],
    }));
  };

  // Mutations
  const uploadPhotosMutation = useMutation({
    mutationFn: async (files: FileList) => {
      console.log('Starting photo upload with files:', files.length);
      
      setCompressionProgress({
        isCompressing: true,
        currentFile: 0,
        totalFiles: files.length,
        originalSize: 0,
        compressedSize: 0,
      });

      const fileArray = Array.from(files);
      let totalOriginalSize = 0;
      let totalCompressedSize = 0;

      // Calculate total original size
      fileArray.forEach(file => {
        totalOriginalSize += file.size;
        console.log('File:', file.name, 'Size:', file.size, 'Type:', file.type);
      });

      try {
        console.log('Starting compression for files:', fileArray.map(f => f.name));
        const { compressedFiles, totalCompressedSizeBytes } = await compressMultipleImages(
          fileArray,
          (progress) => {
            console.log('Compression progress:', progress);
            setCompressionProgress(prev => ({
              ...prev,
              currentFile: progress.currentFile,
              originalSize: totalOriginalSize,
              compressedSize: prev.compressedSize,
            }));
          }
        );

        totalCompressedSize = totalCompressedSizeBytes;
        console.log('Compression complete. Compressed files:', compressedFiles.length);
        console.log('Compressed file details:', compressedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));

        const formData = new FormData();
        compressedFiles.forEach((file, index) => {
          formData.append('photos', file);
          console.log('Added compressed file to FormData:', file.name, file.size);
        });

        console.log('Sending FormData to server...');
        const response = await apiRequest(`/api/projects/${projectId}/photos`, {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();

        setCompressionProgress(prev => ({
          ...prev,
          isCompressing: false,
          originalSize: totalOriginalSize,
          compressedSize: totalCompressedSize,
        }));

        console.log('Photo upload successful:', result);
        return result;
      } catch (error) {
        console.error('Error during compression or upload:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          errorObject: error
        });
        throw error;
      }
    },
    onSuccess: () => {
      console.log('Photo upload mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      queryClient.refetchQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    },
    onError: (error) => {
      console.error('Photo upload failed:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      setCompressionProgress({
        isCompressing: false,
        currentFile: 0,
        totalFiles: 0,
        originalSize: 0,
        compressedSize: 0,
      });
    },
  });

  const uploadReceiptsMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('receipt', file); // Changed from 'receipts' to 'receipt'
      });

      const response = await apiRequest(`/api/projects/${projectId}/receipts`, {
        method: 'POST',
        body: formData,
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/receipts`] });
      if (receiptInputRef.current) {
        receiptInputRef.current.value = '';
      }
    },
    onError: (error) => {
      console.error('Receipt upload failed:', error);
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      await apiRequest(`/api/projects/${projectId}/photos/${photoId}`, {
        method: 'DELETE',
      });
      
      return photoId;
    },
    onSuccess: (deletedPhotoId) => {
      console.log('Photo deleted successfully:', deletedPhotoId);
      // Immediately update the cache to remove the deleted photo
      queryClient.setQueryData([`/api/projects/${projectId}/photos`], (oldData: any) => {
        if (oldData) {
          return oldData.filter((photo: any) => photo.id !== deletedPhotoId);
        }
        return oldData;
      });
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      
      // If carousel is open and we deleted the current photo, close it if it was the last photo
      if (showPhotoCarousel && photos.length <= 1) {
        setShowPhotoCarousel(false);
      }
    },
    onError: (error) => {
      console.error('Photo delete failed:', error);
      console.error('Delete error type:', typeof error);
      console.error('Delete error message:', error?.message);
      console.error('Delete error stack:', error?.stack);
    },
  });

  const addToolMutation = useMutation({
    mutationFn: async (toolName: string) => {
      const response = await apiRequest(`/api/projects/${projectId}/tools`, {
        method: 'POST',
        body: {
          toolName,
        },
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tools`] });
      setNewTool('');
    },
    onError: (error) => {
      console.error('Add tool failed:', error);
    },
  });

  const toggleToolMutation = useMutation({
    mutationFn: async (toolId: number) => {
      await apiRequest(`/api/tools/${toolId}`, {
        method: 'DELETE',
      });
      
      return toolId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tools`] });
    },
    onError: (error) => {
      console.error('Toggle tool failed:', error);
    },
  });

  const deleteHoursMutation = useMutation({
    mutationFn: async (hoursId: number) => {
      await apiRequest(`/api/hours/${hoursId}`, {
        method: 'DELETE',
      });
      
      return hoursId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/hours`] });
    },
    onError: (error) => {
      console.error('Delete hours failed:', error);
    },
  });



  // File upload handlers
  const handlePhotoUpload = (event: any) => {
    console.log('Photo upload handler triggered');
    const files = event.target.files;
    console.log('Selected files:', files);
    if (files && files.length > 0) {
      console.log('Files detected, starting upload:', Array.from(files).map(f => f.name));
      uploadPhotosMutation.mutate(files);
    } else {
      console.log('No files selected');
    }
  };

  const handleReceiptUpload = (event: any) => {
    console.log('Receipt upload handler triggered');
    const files = event.target.files;
    console.log('Selected receipt files:', files);
    if (files && files.length > 0) {
      console.log('Receipt files detected, starting upload:', Array.from(files).map(f => f.name));
      uploadReceiptsMutation.mutate(files);
    } else {
      console.log('No receipt files selected');
    }
  };

  if (!project) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        Loading project...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onClick={onBack}
          variant="outline"
          className="flex items-center gap-2 text-white hover:opacity-90"
          style={{ 
            borderColor: paintBrainColors.red,
            color: paintBrainColors.red
          }}
        >
          <ArrowLeft size={16} />
          Back to Projects
        </Button>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => openWorkCalendar(project)}
            className="p-2 transition-colors"
            style={{ color: paintBrainColors.blue }}
            title="Add to calendar"
          >
            <Calendar size={20} />
          </button>
          <button
            onClick={() => window.open(generateMapsLink(project.address, project.clientCity, project.clientPostal), '_blank')}
            className="p-2 transition-colors relative"
            title="View on maps"
          >
            <div className="relative">
              <MapPin size={20} style={{ color: paintBrainColors.blue }} />
              <div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                style={{ backgroundColor: paintBrainColors.green, marginTop: '-2px' }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Client Info Header */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 relative" style={{ borderWidth: '2px', borderColor: paintBrainColors.purple }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: paintBrainColors.purple }}>
            {project.clientName}
          </h1>
          <p className="mt-1" style={{ color: paintBrainColors.green }}>
            {project.address}, {project.clientCity} {project.clientPostal}
          </p>
          <p className="text-sm mt-1 flex items-center" style={{ color: paintBrainColors.orange }}>
            <span className="capitalize">{project.projectType}</span>
            <span className="px-1">•</span>
            <span>{project.roomCount} room{project.roomCount !== 1 ? 's' : ''}</span>
          </p>
        </div>
        <Button
          onClick={() => setShowEditClient(true)}
          variant="outline"
          size="sm"
          className="absolute bottom-4 right-4 flex items-center gap-2"
          style={{ 
            borderColor: paintBrainColors.red,
            color: paintBrainColors.red
          }}
        >
          <Edit3 size={16} />
          Edit
        </Button>
      </div>



      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        onChange={handlePhotoUpload}
        multiple
        className="hidden"
      />
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        onChange={handleReceiptUpload}
        multiple
        className="hidden"
      />

      {/* Compression Progress */}
      {compressionProgress.isCompressing && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: paintBrainColors.blue }}>
              Compressing photos...
            </span>
            <span style={{ color: paintBrainColors.green }}>
              {compressionProgress.currentFile} / {compressionProgress.totalFiles}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                backgroundColor: paintBrainColors.green,
                width: `${(compressionProgress.currentFile / compressionProgress.totalFiles) * 100}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* NEW: Mac-Style Collapsible Menu with ReactSortable */}
      <div className="mt-8 p-6 bg-gradient-to-r from-gray-900 to-black rounded-lg border border-gray-700">
        <ReactSortable 
          list={menuSections} 
          setList={setMenuSections}
          animation={150}
          handle=".drag-handle"
          className="space-y-2"
        >
          {menuSections.map((section) => {
            const IconComponent = section.icon;
            const isExpanded = expandedSections[section.id as keyof typeof expandedSections];
            
            // Get section data count for badges
            let itemCount = 0;
            switch(section.id) {
              case 'photos': itemCount = photos.length; break;
              case 'tools': itemCount = tools.length; break;
              case 'dailyHours': itemCount = dailyHours.length; break;
              case 'receipts': itemCount = receipts.length; break;
              default: itemCount = 0;
            }
            
            // Update section name for photos and get appropriate color
            const sectionName = section.id === 'photos' ? 'Photo Gallery' : section.name;
            const getSectionColor = (sectionId: string) => {
              switch (sectionId) {
                case 'photos': return paintBrainColors.orange;   // Orange for photo gallery
                case 'tools': return paintBrainColors.yellow;    // Yellow for tools
                case 'dailyHours': return paintBrainColors.green; // Green for daily hours
                case 'notes': return paintBrainColors.blue;      // Blue for project notes
                case 'receipts': return paintBrainColors.purple; // Purple for receipts
                default: return paintBrainColors.gray;
              }
            };

            return (
              <div
                key={section.id}
                className="bg-gray-800 rounded-lg border-2 overflow-hidden"
                style={{ borderColor: getSectionColor(section.id) }}
              >
                {/* Section Header */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Mac-style Reorder Icon - Left Side */}
                    <div className="drag-handle cursor-move p-1 hover:opacity-80" onClick={(e) => e.stopPropagation()}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ color: getSectionColor(section.id) }}>
                        <rect y="2" width="16" height="1.5" rx="0.75"/>
                        <rect y="5.5" width="16" height="1.5" rx="0.75"/>
                        <rect y="9" width="16" height="1.5" rx="0.75"/>
                        <rect y="12.5" width="16" height="1.5" rx="0.75"/>
                      </svg>
                    </div>
                    
                    <IconComponent size={20} style={{ color: getSectionColor(section.id) }} />
                    <span className="font-medium" style={{ color: getSectionColor(section.id) }}>{sectionName}</span>
                    
                    {/* Enhanced Data Status Badge */}
                    {itemCount > 0 && (
                      <span 
                        className="text-white text-xs px-4 py-1 rounded-full font-medium whitespace-nowrap"
                        style={{ backgroundColor: getSectionColor(section.id) }}
                      >
                        {(() => {
                          switch(section.id) {
                            case 'photos': 
                              return `${itemCount} photo${itemCount !== 1 ? 's' : ''}`;
                            case 'tools': 
                              return `${itemCount} tool${itemCount !== 1 ? 's' : ''}`;
                            case 'dailyHours': {
                              const totalHours = dailyHours.reduce((sum, entry) => sum + entry.hours, 0);
                              const totalEarnings = totalHours * (project?.hourlyRate || 60);
                              return `${totalHours}hr • $${totalEarnings.toLocaleString()}`;
                            }
                            case 'receipts': {
                              const totalAmount = receipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount), 0);
                              return `${itemCount} receipt${itemCount !== 1 ? 's' : ''} • $${totalAmount.toLocaleString()}`;
                            }
                            default: 
                              return itemCount.toString();
                          }
                        })()}
                      </span>
                    )}
                  </div>
                  
                  {/* Simple Expand Indicator */}
                  <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-gray-400">
                      <path d="M6 4l4 4-4 4V4z"/>
                    </svg>
                  </div>
                </div>

                {/* Section Content */}
                {isExpanded && (
                  <div className="border-t border-gray-600 p-4 bg-gray-900">
                    {section.id === 'photos' && (
                      <div>
                        {/* Photo Upload Options */}
                        <div className="mb-4 grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => {
                              // Create input for direct camera access
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*,.heic,.heif';
                              input.capture = 'environment';
                              input.multiple = true;
                              input.onchange = handlePhotoUpload;
                              input.click();
                            }}
                            className="py-3 text-sm font-semibold text-white flex items-center justify-center hover:opacity-90"
                            style={{ backgroundColor: paintBrainColors.purple }}
                          >
                            <Camera size={16} className="mr-2" />
                            Camera
                          </Button>
                          <Button
                            onClick={() => {
                              // Create input for photo library access only (no camera)
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*,.heic,.heif';
                              input.multiple = true;
                              // No capture attribute - this forces library selection
                              input.onchange = handlePhotoUpload;
                              input.click();
                            }}
                            className="py-3 text-sm font-semibold text-white flex items-center justify-center hover:opacity-90"
                            style={{ backgroundColor: paintBrainColors.green }}
                          >
                            <Upload size={16} className="mr-2" />
                            Upload
                          </Button>
                        </div>
                        
                        {/* Selection Toolbar */}
                        {selectedPhotos.size > 0 && (
                          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-100">
                              {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected
                            </span>
                            <div className="flex gap-2">
                              <Button
                                onClick={clearSelection}
                                variant="outline"
                                size="sm"
                                className="text-gray-200 border-gray-600"
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
                        {photos.length > 0 ? (
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
                                
                                {/* Individual Delete Button */}
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
                        ) : (
                          <div className="p-4 text-center text-gray-400">
                            <Camera size={24} className="mx-auto mb-2" />
                            <p>No photos yet. Use the camera button above to add some!</p>
                          </div>
                        )}
                      </div>
                    )}

                    {section.id === 'tools' && (
                      <div>

                        {/* Add Tool Input */}
                        <div className="flex gap-2 mb-4">
                          <input
                            type="text"
                            value={newTool}
                            onChange={(e) => setNewTool(e.target.value)}
                            placeholder="Paint brushes, Drop cloths, Ladder, Rollers..."
                            className="flex-1 px-3 py-2 text-sm border border-gray-600 rounded-lg bg-gray-800 text-gray-200 placeholder-gray-400"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newTool.trim()) {
                                addToolMutation.mutate(newTool.trim());
                              }
                            }}
                          />
                          <button
                            onClick={() => newTool.trim() && addToolMutation.mutate(newTool.trim())}
                            disabled={!newTool.trim() || addToolMutation.isPending}
                            className="px-3 py-2 text-white border-0 rounded-md text-sm font-medium disabled:opacity-50"
                            style={{ backgroundColor: '#8B5FBF', borderColor: '#8B5FBF', border: 'none' }}
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        {/* Tools List */}
                        <div className="h-48 overflow-y-auto border border-gray-600 rounded-lg p-3 space-y-2 bg-gray-800">
                          {tools.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">
                              No tools added yet. Add tools you need to bring to this job.
                            </p>
                          ) : (
                            tools.map((tool) => (
                              <div key={tool.id} className="flex items-center gap-3 group">
                                <button
                                  onClick={() => toggleToolMutation.mutate(tool.id)}
                                  className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors border-gray-500 hover:border-green-500 hover:bg-green-900/20"
                                  title="Click to mark as complete and remove from list"
                                >
                                  {/* Empty checkbox - clicking it will delete the tool */}
                                </button>
                                <span className="flex-1 text-sm text-gray-200">
                                  {tool.toolName}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {section.id === 'dailyHours' && (
                      <div>
                        {/* Add Hours Button */}
                        {!showDatePicker && (
                          <button
                            onClick={() => setShowDatePicker(true)}
                            className="w-full mb-4 py-2 text-sm text-white border-0 rounded-md font-medium"
                            style={{ backgroundColor: '#6A9955', borderColor: '#6A9955', border: 'none' }}
                          >
                            <Plus size={16} className="mr-2" />
                            Log Hours for a Day
                          </button>
                        )}

                        {/* Date Picker and Hours Input */}
                        {showDatePicker && (
                          <div className="mb-4 p-4 bg-gray-800 rounded-lg space-y-3 border border-gray-600">
                            <div>
                              <label className="text-sm font-medium mb-2 block text-gray-200">
                                Select Date
                                <span className="ml-2 text-xs px-2 py-1 bg-green-900/30 text-green-300 rounded">
                                  Today: {formatDateForInput(new Date())}
                                </span>
                              </label>
                              <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                  setSelectedDate(e.target.value);
                                  if (e.target.value) {
                                    setTimeout(() => {
                                      const hoursInput = document.querySelector('input[placeholder="0"]') as HTMLInputElement;
                                      if (hoursInput) hoursInput.focus();
                                    }, 100);
                                  }
                                }}
                                className="w-full px-3 py-2 text-sm border-2 border-green-600 rounded-lg bg-green-900/20 text-gray-200 focus:border-green-500"
                                max={formatDateForInput(new Date())}
                                style={{ colorScheme: 'dark' }}
                              />
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium mb-2 block text-gray-200">Hours Worked</label>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                value={hoursInput}
                                onChange={(e) => setHoursInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && hoursInput) {
                                    handleAddHours();
                                  }
                                }}
                                placeholder="0"
                                className="w-full px-3 py-2 text-sm border border-gray-600 rounded-lg bg-gray-800 text-gray-200"
                              />
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium mb-2 block text-gray-200">Description</label>
                              <input
                                type="text"
                                value={descriptionInput}
                                onChange={(e) => setDescriptionInput(e.target.value)}
                                placeholder=""
                                className="w-full px-3 py-2 text-sm border border-gray-600 rounded-lg bg-gray-800 text-gray-200"
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={handleAddHours}
                                disabled={!hoursInput || addHoursMutation.isPending}
                                className="flex-1 text-white border-0 py-2 rounded-md font-medium disabled:opacity-50"
                                style={{ backgroundColor: '#6A9955', borderColor: '#6A9955', border: 'none' }}
                              >
                                {addHoursMutation.isPending ? 'Adding...' : 'Add Hours'}
                              </button>
                              <Button
                                onClick={() => {
                                  setShowDatePicker(false);
                                  setSelectedDate('');
                                  setHoursInput('');
                                  setDescriptionInput('');
                                }}
                                variant="outline"
                                className="flex-1 border-gray-600 text-gray-300"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Hours List */}
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {dailyHours.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">
                              No hours logged yet. Start tracking your work time!
                            </p>
                          ) : (
                            dailyHours.map((hours) => (
                              <div key={hours.id} className="p-3 bg-gray-800 rounded-lg border border-gray-600">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="font-medium text-gray-100">
                                        {new Date(hours.date + 'T00:00:00').toLocaleDateString('en-US', { 
                                          weekday: 'short', 
                                          month: 'short', 
                                          day: 'numeric' 
                                        })}
                                      </span>
                                      <span className="text-gray-400">•</span>
                                      <span className="font-semibold text-blue-400">
                                        {hours.hours}hr
                                      </span>
                                      {hours.description && (
                                        <>
                                          <span className="text-gray-400">•</span>
                                          <span className="text-gray-400">
                                            {hours.description}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-green-400 font-medium">
                                      ${(hours.hours * 60).toFixed(0)}
                                    </span>
                                    <button
                                      onClick={() => deleteHoursMutation.mutate(hours.id)}
                                      disabled={deleteHoursMutation.isPending}
                                      className="p-0.5 text-red-400 hover:text-red-300 transition-colors opacity-60 hover:opacity-100"
                                      title="Delete"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Hours Summary at Bottom */}
                        {dailyHours.length > 0 && (
                          <div className="mt-4 p-4 bg-green-900/20 rounded-lg border border-green-700">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-2xl font-bold text-green-300">$60/hr</span>
                            </div>
                            <div className="pt-2 border-t border-green-700">
                              <div className="flex items-center justify-between w-full">
                                <span className="font-semibold text-green-300 text-sm sm:text-base">
                                  {dailyHours.reduce((sum, h) => sum + h.hours, 0).toFixed(1)} hours
                                </span>
                                <span className="text-sm sm:text-base text-green-400 font-bold">
                                  ${(dailyHours.reduce((sum, h) => sum + (h.hours * 60), 0)).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {section.id === 'notes' && (
                      <div>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          onBlur={handleNotesBlur}
                          placeholder=""
                          className="w-full min-h-48 resize-none rounded-lg border border-gray-600 p-3 text-sm bg-gray-800 text-gray-200 placeholder-gray-400"
                        />
                      </div>
                    )}

                    {section.id === 'receipts' && (
                      <div>
                        {/* Receipt Upload Options */}
                        <div className="mb-4 grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => {
                              // Create input for direct camera access
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*,.heic,.heif';
                              input.capture = 'environment';
                              input.multiple = true;
                              input.onchange = handleReceiptUpload;
                              input.click();
                            }}
                            className="py-3 text-sm font-semibold text-white flex items-center justify-center hover:opacity-90"
                            style={{ backgroundColor: paintBrainColors.purple }}
                          >
                            <Camera size={16} className="mr-2" />
                            Camera
                          </Button>
                          <Button
                            onClick={() => {
                              // Create input for photo library access only (no camera)
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*,.heic,.heif';
                              input.multiple = true;
                              // No capture attribute - this forces library selection
                              input.onchange = handleReceiptUpload;
                              input.click();
                            }}
                            className="py-3 text-sm font-semibold text-white flex items-center justify-center hover:opacity-90"
                            style={{ backgroundColor: paintBrainColors.green }}
                          >
                            <Upload size={16} className="mr-2" />
                            Upload
                          </Button>
                        </div>
                        
                        {/* Quick Receipt Entry Form */}
                        <div className="mb-4">
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
                                date: new Date().toISOString().split('T')[0],
                                filename: null
                              };
                              
                              apiRequest(`/api/projects/${project.id}/receipts`, {
                                method: 'POST',
                                body: receiptData,
                              }).then(async (response) => {
                                queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/receipts`] });
                                (e.target as HTMLFormElement).reset();
                              }).catch((error) => {
                                console.error('Receipt creation failed:', error);
                                alert('Failed to add receipt. Please try again.');
                              });
                            }}
                            className="flex gap-2"
                          >
                            <Input
                              name="item"
                              placeholder=""
                              className="flex-1 h-9 bg-gray-800 border-gray-600 text-gray-200"
                            />
                            <Input
                              name="price"
                              type="number"
                              step="0.01"
                              placeholder="$0.00"
                              className="w-24 h-9 bg-gray-800 border-gray-600 text-gray-200"
                            />
                            <Button 
                              type="submit" 
                              size="sm"
                              className="h-9 px-3 text-xs text-white hover:opacity-90"
                              style={{ backgroundColor: paintBrainColors.green }}
                            >
                              Add Item
                            </Button>
                          </form>
                        </div>
                        
                        <SimpleFilesList projectId={project.id} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </ReactSortable>
        
        <div className="mt-4 text-white">
          <span className="text-sm flex items-center gap-1" style={{ color: paintBrainColors.green }}>
            Drag 
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ color: paintBrainColors.yellow }}>
              <rect y="2" width="16" height="1.5" rx="0.75"/>
              <rect y="5.5" width="16" height="1.5" rx="0.75"/>
              <rect y="9" width="16" height="1.5" rx="0.75"/>
              <rect y="12.5" width="16" height="1.5" rx="0.75"/>
            </svg>
            to re-order
          </span>
        </div>
      </div>

      {/* Generate Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={() => setShowEstimateGenerator(true)}
          className="py-3 text-sm font-semibold text-white flex items-center justify-center hover:opacity-90"
          style={{ backgroundColor: paintBrainColors.purple }}
        >
          <Calculator size={18} className="mr-2" />
          Generate Estimate
        </Button>
        <Button
          onClick={() => setShowInvoiceGenerator(true)}
          className="py-3 text-sm font-semibold text-white hover:opacity-90"
          style={{ backgroundColor: paintBrainColors.green }}
        >
          <FileText size={18} className="mr-2" />
          Generate Invoice
        </Button>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={receiptInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleReceiptUpload}
        multiple
        className="hidden"
      />

      {/* Enhanced Photo Carousel */}
      {showPhotoCarousel && photos.length > 0 && (
        <PhotoCarousel
          photos={photos}
          initialIndex={carouselIndex}
          onClose={() => setShowPhotoCarousel(false)}
          onDelete={(photoId) => deletePhotoMutation.mutate(photoId)}
        />
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
                <label className="text-sm font-medium mb-2 block">City</label>
                <Input
                  value={editForm.clientCity || ''}
                  onChange={(e) => handleEditInputChange('clientCity', e.target.value)}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Postal Code</label>
                <Input
                  value={editForm.clientPostal || ''}
                  onChange={(e) => handleEditInputChange('clientPostal', e.target.value)}
                  placeholder="Enter postal code"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  value={editForm.clientEmail || ''}
                  onChange={(e) => handleEditInputChange('clientEmail', e.target.value)}
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Phone</label>
                <Input
                  value={editForm.clientPhone || ''}
                  onChange={(e) => handleEditInputChange('clientPhone', e.target.value)}
                  placeholder="Enter phone"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Project Type</label>
              <Input
                value={editForm.projectType || ''}
                onChange={(e) => handleEditInputChange('projectType', e.target.value)}
                placeholder="Enter project type"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Room Count</label>
                <Input
                  type="number"
                  value={editForm.roomCount || ''}
                  onChange={(e) => handleEditInputChange('roomCount', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Hourly Rate</label>
                <Input
                  type="number"
                  value={editForm.hourlyRate || ''}
                  onChange={(e) => handleEditInputChange('hourlyRate', parseFloat(e.target.value) || 0)}
                  placeholder="$0"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSaveEdit}
              disabled={editProjectMutation.isPending}
              className="flex-1 text-white hover:opacity-90"
              style={{ backgroundColor: paintBrainColors.purple }}
            >
              {editProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button 
              onClick={() => setShowEditClient(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}