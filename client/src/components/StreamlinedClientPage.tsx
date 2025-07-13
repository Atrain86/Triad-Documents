import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
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
import ErrorTooltip from './ui/error-tooltip';
import SuccessTooltip from './ui/success-tooltip';
import { useErrorTooltip } from '@/hooks/useErrorTooltip';
import { ReactSortable } from 'react-sortablejs';
import PaintBrainCalendar from './PaintBrainCalendar';

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
      const response = await fetch(`/api/receipts/${receiptId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status}`);
      }
      
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
      const response = await fetch(`/api/receipts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vendor, amount, description }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update receipt: ${response.status}`);
      }
      
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
                <Button
                  onClick={handleSave}
                  disabled={updateReceiptMutation.isPending}
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {updateReceiptMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
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
                {receipt.description && (
                  <p className="text-xs text-gray-400 mt-1">{receipt.description}</p>
                )}
                <p className="text-xs text-gray-500">{formatDate(receipt.date)}</p>
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
  // Query client MUST be declared first
  const queryClient = useQueryClient();
  
  // Error tooltip system
  const { errorState, showUploadError, showDeleteError, showSaveError, showLoadError, hideError } = useErrorTooltip();
  
  // Success message state
  const [successMessage, setSuccessMessage] = useState({ isVisible: false, message: '' });

  // File input refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

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

  // Menu customization states with localStorage persistence
  const [menuSections, setMenuSections] = useState(() => {
    const defaultSections = [
      { id: 'photos', name: 'Photos', icon: Camera },
      { id: 'tools', name: 'Tools', icon: Wrench },
      { id: 'dailyHours', name: 'Daily Hours', icon: Calendar },
      { id: 'notes', name: 'Project Notes', icon: FileText },
      { id: 'receipts', name: 'Receipts & Expenses', icon: ReceiptIcon },
    ];
    
    try {
      const saved = localStorage.getItem('paintbrain-section-order');
      if (saved) {
        const savedOrder = JSON.parse(saved);
        // Merge saved order with default sections to handle new sections
        const orderedSections = savedOrder.map((savedSection: any) => 
          defaultSections.find(section => section.id === savedSection.id)
        ).filter(Boolean);
        
        // Add any new sections that weren't in saved order
        const missingIds = defaultSections.filter(section => 
          !savedOrder.some((saved: any) => saved.id === section.id)
        );
        
        return [...orderedSections, ...missingIds];
      }
    } catch (error) {
      console.log('Failed to load section order from localStorage');
    }
    
    return defaultSections;
  });

  // Save section order to localStorage whenever it changes
  React.useEffect(() => {
    try {
      localStorage.setItem('paintbrain-section-order', JSON.stringify(menuSections));
    } catch (error) {
      console.log('Failed to save section order to localStorage');
    }
  }, [menuSections]);

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

  // Handle date picker opening - simplified since we removed the problematic native input
  const handleOpenDatePicker = React.useCallback(() => {
    setShowDatePicker(true);
  }, []);

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
    difficulty: 1,
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

  // API queries
  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: [`/api/projects/${projectId}/photos`],
  });

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
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to edit project: ${response.status} - ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      setShowEditClient(false);
    },
    onError: (error) => {
      console.error('Edit project failed:', error);
      showSaveError('project', error, () => {
        editProjectMutation.mutate(editForm);
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update project: ${response.status} - ${errorText}`);
      }
      
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
      const response = await fetch(`/api/projects/${projectId}/hours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: hoursData.date,
          hours: hoursData.hours,
          description: hoursData.description,
          hourlyRate: project?.hourlyRate || 60, // Include hourlyRate from project
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add hours: ${response.status} - ${errorText}`);
      }
      
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
      showSaveError('hours', error, () => {
        if (selectedDate && hoursInput) {
          handleAddHours();
        }
      });
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
        fetch(`/api/projects/${projectId}/photos/${id}`, { method: 'DELETE' })
      );
      
      const responses = await Promise.all(deletePromises);
      
      responses.forEach((response, index) => {
        if (!response.ok) {
          throw new Error(`Failed to delete photo ${photoIds[index]}: ${response.status}`);
        }
      });
      
      return photoIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      clearSelection();
    },
    onError: (error) => {
      console.error('Bulk delete failed:', error);
      showDeleteError('photo', error, () => {
        if (selectedPhotos.size > 0) {
          deleteSelectedPhotosMutation.mutate(Array.from(selectedPhotos));
        }
      });
    },
  });

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
        difficulty: project.difficulty || 1,
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
              compressedSize: progress.compressedSize || 0,
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
        const response = await fetch(`/api/projects/${projectId}/photos`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
        
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
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
      // Show success message
      setSuccessMessage({ isVisible: true, message: 'Photos uploaded successfully!' });
    },
    onError: (error) => {
      console.error('Photo upload failed:', error);
      setCompressionProgress({
        isCompressing: false,
        currentFile: 0,
        totalFiles: 0,
        originalSize: 0,
        compressedSize: 0,
      });
      
      // Show user-friendly error tooltip
      showUploadError('photo', error, () => {
        if (photoInputRef.current?.files) {
          uploadPhotosMutation.mutate(photoInputRef.current.files);
        }
      });
    },
  });

  const uploadReceiptsMutation = useMutation({
    mutationFn: async (files: FileList) => {
      console.log('Starting receipt upload with files:', files.length);
      const results = [];
      
      // Process files one by one since server expects single file
      for (const file of Array.from(files)) {
        console.log('Processing receipt file:', file.name, 'Size:', file.size);
        
        const formData = new FormData();
        formData.append('receipt', file); // Use 'receipt' (singular) to match server

        const response = await fetch(`/api/projects/${projectId}/receipts`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Receipt upload failed for ${file.name}: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Receipt upload successful for:', file.name, result);
        results.push(result);
      }
      
      return results;
    },
    onSuccess: (results) => {
      console.log('All receipts uploaded successfully:', results);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/receipts`] });
      if (receiptInputRef.current) {
        receiptInputRef.current.value = '';
      }
      // Show success message
      setSuccessMessage({ 
        isVisible: true, 
        message: `${results.length} receipt${results.length > 1 ? 's' : ''} uploaded and processed!` 
      });
    },
    onError: (error) => {
      console.error('Receipt upload failed:', error);
      
      // Show user-friendly error tooltip
      showUploadError('receipt', error, () => {
        if (receiptInputRef.current?.files) {
          uploadReceiptsMutation.mutate(receiptInputRef.current.files);
        }
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      console.log('Attempting to delete photo ID:', photoId);
      const response = await fetch(`/api/projects/${projectId}/photos/${photoId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete photo: ${response.status}`);
      }
      
      console.log('Photo delete successful:', photoId);
      return photoId;
    },
    onSuccess: (deletedPhotoId) => {
      console.log('Photo delete mutation success, invalidating queries for deleted photo:', deletedPhotoId);
      
      // Force refetch instead of just invalidate to ensure fresh data
      queryClient.refetchQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      
      // Close carousel if we're viewing the deleted photo
      if (showPhotoCarousel) {
        const photoIndex = photos.findIndex(p => p.id === deletedPhotoId);
        if (photoIndex === carouselIndex) {
          if (photos.length === 1) {
            setShowPhotoCarousel(false);
          } else if (carouselIndex === photos.length - 1) {
            setCarouselIndex(carouselIndex - 1);
          }
        }
      }
    },
    onError: (error) => {
      console.error('Delete failed:', error);
      showDeleteError('photo', error, () => {
        // No automatic retry for delete - too dangerous
      });
    },
  });

  const addToolMutation = useMutation({
    mutationFn: async (toolName: string) => {
      const response = await fetch(`/api/projects/${projectId}/tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolName,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add tool: ${response.status} - ${errorText}`);
      }
      
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
      const response = await fetch(`/api/tools/${toolId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to complete tool: ${response.status}`);
      }
      
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
      const response = await fetch(`/api/hours/${hoursId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete hours: ${response.status}`);
      }
      
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
    <div className="min-h-screen">
      {/* Header - Constrained */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Projects
          </Button>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => openWorkCalendar(project)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              title="Add to calendar"
            >
              <Calendar size={16} />
            </Button>
            <button
              onClick={() => window.open(generateMapsLink(project.address, project.clientCity, project.clientPostal), '_blank')}
              className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
              title="View on maps"
            >
              <MapPin size={16} />
            </button>
          </div>
        </div>

        {/* Client Info Header - Constrained */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {project.clientName}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {project.address}, {project.clientCity} {project.clientPostal}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {project.projectType} • {project.roomCount} rooms • Difficulty: {project.difficulty}/5
              </p>
            </div>
            <Button
              onClick={() => setShowEditClient(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Edit3 size={16} />
              Edit
            </Button>
          </div>
        </div>
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
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Compressing photos...
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              {compressionProgress.currentFile} / {compressionProgress.totalFiles}
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(compressionProgress.currentFile / compressionProgress.totalFiles) * 100}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* NEW: Mac-Style Collapsible Menu with ReactSortable - Full Width */}
      <div className="w-full px-4 py-6">
        <div className="max-w-4xl mx-auto mb-4">
          <h3 className="text-lg font-semibold text-white">
            Customizable Menu (Drag to Reorder)
          </h3>
        </div>
        
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
            
            // Get section data and status for enhanced badges
            let badgeContent = null;
            let badgeColor = 'bg-blue-600';
            
            switch(section.id) {
              case 'photos':
                if (photos.length > 0) {
                  badgeContent = `${photos.length} photos`;
                  badgeColor = 'bg-orange-600';
                }
                break;
                
              case 'tools':
                if (tools.length > 0) {
                  badgeContent = `${tools.length} tools`;
                  badgeColor = 'bg-yellow-600';
                }
                break;
                
              case 'dailyHours':
                if (dailyHours.length > 0) {
                  const totalEarned = dailyHours.reduce((sum, h) => sum + (h.hours * 60), 0);
                  badgeContent = `${dailyHours.length} days • $${totalEarned}`;
                  badgeColor = 'bg-green-600';
                }
                break;
                
              case 'receipts':
                if (receipts.length > 0) {
                  const totalSpent = receipts.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
                  badgeContent = `${receipts.length} receipts • $${totalSpent.toFixed(0)}`;
                  badgeColor = 'bg-purple-600';
                }
                break;
                
              case 'notes':
                if (notes && notes.trim().length > 0) {
                  const wordCount = notes.trim().split(/\s+/).length;
                  badgeContent = `${wordCount} words`;
                  badgeColor = 'bg-blue-600';
                }
                break;
                
              default:
                badgeContent = null;
            }
            
            // Update section name for photos
            const sectionName = section.id === 'photos' ? 'Photo Gallery' : section.name;

            return (
              <div
                key={section.id}
                className="bg-gray-800 rounded-lg border border-gray-600 overflow-hidden"
              >
                {/* Section Header */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Mac-style Reorder Icon - Left Side */}
                    <div className="drag-handle cursor-move p-1 text-white hover:text-gray-200" onClick={(e) => e.stopPropagation()}>
                      <svg width="16" height="16" viewBox="0 0 16 16" className="text-white">
                        <rect y="2" width="16" height="1.5" rx="0.75" fill="currentColor"/>
                        <rect y="5.5" width="16" height="1.5" rx="0.75" fill="currentColor"/>
                        <rect y="9" width="16" height="1.5" rx="0.75" fill="currentColor"/>
                        <rect y="12.5" width="16" height="1.5" rx="0.75" fill="currentColor"/>
                      </svg>
                    </div>
                    
                    <IconComponent size={20} className="text-gray-300" />
                    <span className="text-gray-100 font-medium">{sectionName}</span>
                    
                    {/* Enhanced Status Badge */}
                    {badgeContent && (
                      <span className={`${badgeColor} text-white text-xs px-2 py-1 rounded-full font-medium`}>
                        {badgeContent}
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

                {/* Section Content - Full Width */}
                {isExpanded && (
                  <div className="border-t border-gray-600 px-8 py-6 bg-gray-800 w-full">
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
                            className="py-3 text-sm font-semibold text-white flex items-center justify-center"
                            style={{ backgroundColor: '#EA580C' }}
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
                            className="py-3 text-sm font-semibold text-white flex items-center justify-center bg-orange-600 hover:bg-orange-700"
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
                          <Button
                            onClick={() => newTool.trim() && addToolMutation.mutate(newTool.trim())}
                            disabled={!newTool.trim() || addToolMutation.isPending}
                            size="sm"
                            className="px-3 bg-blue-600 hover:bg-blue-700"
                          >
                            <Plus size={16} />
                          </Button>
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
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        {/* Add Hours Button */}
                        {!showDatePicker && (
                          <Button
                            onClick={handleOpenDatePicker}
                            className="w-full mb-4 py-2 text-sm bg-green-600 hover:bg-green-700"
                            variant="outline"
                            type="button"
                          >
                            <Plus size={16} className="mr-2" />
                            Log Hours for a Day
                          </Button>
                        )}

                        {/* Paint Brain Calendar and Hours Input */}
                        {showDatePicker && (
                          <div className="mb-4 p-4 bg-gray-800 rounded-lg space-y-4 border border-gray-600">
                            {/* Close button */}
                            <div className="flex justify-end">
                              <Button
                                onClick={() => {
                                  setShowDatePicker(false);
                                  setSelectedDate('');
                                  setHoursInput('');
                                  setDescriptionInput('');
                                }}
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-white p-2"
                              >
                                <X size={16} />
                              </Button>
                            </div>
                            
                            <div className="w-full overflow-hidden" style={{ maxWidth: '100vw' }}>
                              <PaintBrainCalendar
                                selectedDate={selectedDate}
                                onDateSelect={(date) => {
                                  setSelectedDate(date);
                                  setTimeout(() => {
                                    const hoursInput = document.querySelector('input[placeholder="0"]') as HTMLInputElement;
                                    if (hoursInput) hoursInput.focus();
                                  }, 100);
                                }}
                                maxDate={formatDateForInput(new Date())}
                                className="w-full"
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
                              <Button
                                onClick={handleAddHours}
                                disabled={!hoursInput || addHoursMutation.isPending}
                                className="flex-1 bg-green-600 hover:bg-green-700"
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
                                        {dayjs(hours.date).format('ddd, MMM D')}
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
                          <div className="mt-4 p-3 bg-green-900/20 rounded-lg border border-green-700">
                            <div className="text-2xl font-bold text-green-300 mb-2">
                              $60/hr
                            </div>
                            <div className="pt-2 border-t border-green-700">
                              <div className="font-semibold text-green-300">
                                Total Hours: {dailyHours.reduce((sum, h) => sum + h.hours, 0).toFixed(1)}
                              </div>
                              <div className="text-sm text-green-400">
                                Total Earned: ${(dailyHours.reduce((sum, h) => sum + (h.hours * 60), 0)).toFixed(2)}
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
                            className="py-3 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center"
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
                            className="py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
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
                              
                              fetch(`/api/projects/${project.id}/receipts`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(receiptData),
                              }).then(async (response) => {
                                if (response.ok) {
                                  queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}/receipts`] });
                                  (e.target as HTMLFormElement).reset();
                                } else {
                                  const errorData = await response.text();
                                  console.error('Receipt creation failed:', errorData);
                                  alert('Failed to add receipt. Please try again.');
                                }
                              }).catch((error) => {
                                console.error('Network error:', error);
                                alert('Network error. Please check your connection and try again.');
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
                              className="h-9 px-3 text-xs text-white bg-orange-600 hover:bg-orange-700"
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


      </div>

      {/* Generate Buttons - Constrained */}
      <div className="max-w-4xl mx-auto px-6 pb-6">
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => setShowEstimateGenerator(true)}
            className="py-3 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center"
          >
            <Calculator size={18} className="mr-2" />
            Generate Estimate
          </Button>
          <Button
            onClick={() => setShowInvoiceGenerator(true)}
            className="py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FileText size={18} className="mr-2" />
            Generate Invoice
          </Button>
        </div>
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
            
            <div className="grid grid-cols-3 gap-3">
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
                <label className="text-sm font-medium mb-2 block">Difficulty</label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={editForm.difficulty || ''}
                  onChange={(e) => handleEditInputChange('difficulty', parseInt(e.target.value) || 1)}
                  placeholder="1-5"
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
              className="flex-1"
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

      {/* Error Tooltip System */}
      <ErrorTooltip
        isVisible={errorState.isVisible}
        context={errorState.context}
        onClose={hideError}
      />

      {/* Success Tooltip System */}
      <SuccessTooltip
        isVisible={successMessage.isVisible}
        message={successMessage.message}
        onClose={() => setSuccessMessage({ isVisible: false, message: '' })}
      />
    </div>
  );
}