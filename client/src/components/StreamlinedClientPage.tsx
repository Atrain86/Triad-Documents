import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Camera, FileText, ArrowLeft, Edit3, Download, X, Image as ImageIcon, DollarSign, Calendar, Wrench, Plus, Trash2, Calculator, Receipt as ReceiptIcon, MapPin, Navigation, ExternalLink, Upload, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';


import { compressMultipleImages, formatFileSize } from '@/lib/imageCompression';
import type { Project, Photo, Receipt, ToolsChecklist, DailyHours } from '@shared/schema';
import InvoiceGenerator from './InvoiceGenerator';
import EstimateGenerator from './EstimateGenerator';
import PhotoCarousel from './PhotoCarousel';
import PaintBrainCalendar from './PaintBrainCalendar';
import ClientPhone from './ClientPhone';
import DarkModeCalendar from './DarkModeCalendar';
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
const openWorkCalendar = (clientProject: Project | null = null, setShowCalendar?: (show: boolean) => void) => {
  // Open Google Calendar in month view - you can manually uncheck ALAN and MAIN 1 calendars in sidebar
  window.open('https://calendar.google.com/calendar/u/0/r/month', '_blank');
};

// Improved file list component
function SimpleFilesList({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);
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

  // Helper function to check if receipt is a PDF or document
  const isPdfOrDoc = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    return ['pdf', 'doc', 'docx', 'txt'].includes(ext || '');
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
    <>
      {/* Receipt Viewer Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50">
          {/* Close X Button */}
          <X 
            className="fixed top-4 right-4 w-12 h-12 text-red-500 cursor-pointer z-50" 
            onClick={() => setViewingReceipt(null)}
            style={{ 
              position: 'fixed',
              top: '16px', 
              right: '16px',
              width: '48px',
              height: '48px',
              color: '#ef4444',
              cursor: 'pointer',
              zIndex: 999999,
              backgroundColor: 'white',
              borderRadius: '50%',
              padding: '8px'
            }}
          />
          
          {/* Receipt Content */}
          <div className="flex items-center justify-center h-full p-4">
            {viewingReceipt.filename && isPdfOrDoc(viewingReceipt.filename) ? (
              <iframe
                src={`/uploads/${viewingReceipt.filename}`}
                className="w-full h-full border-none"
                title={`Receipt from ${viewingReceipt.vendor}`}
              />
            ) : (
              <img 
                src={`/uploads/${viewingReceipt.filename}`} 
                alt={`Receipt from ${viewingReceipt.vendor}`}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
          

        </div>
      )}
      
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
              <div className="flex items-start gap-3 flex-1">
                {/* File type indicator */}
                <div className="flex-shrink-0 mt-0.5">
                  {receipt.filename && isPdfOrDoc(receipt.filename) ? (
                    <FileText size={16} className="text-red-400" />
                  ) : receipt.filename ? (
                    <ImageIcon size={16} className="text-green-400" />
                  ) : (
                    <Edit3 size={16} className="text-yellow-400" />
                  )}
                </div>
                
                {/* Vendor, date and description aligned */}
                <div className="flex-1 min-w-0">
                  {receipt.filename ? (
                    <button
                      onClick={() => {
                        console.log('Setting viewing receipt:', receipt);
                        setViewingReceipt(receipt);
                      }}
                      className="text-blue-400 hover:text-blue-300 underline text-sm block text-left"
                    >
                      {receipt.vendor} - ${Number(receipt.amount || 0).toFixed(2)}
                    </button>
                  ) : (
                    <div className="text-gray-200 text-sm">
                      {receipt.vendor} - ${Number(receipt.amount || 0).toFixed(2)}
                    </div>
                  )}
                  
                  {receipt.date && (
                    <p className="text-xs mt-1" style={{ color: paintBrainColors.orange }}>{formatDate(String(receipt.date))}</p>
                  )}
                  
                  {receipt.description && receipt.description.trim() && (
                    <p className="text-xs text-gray-400 mt-1">{receipt.description}</p>
                  )}
                  
                  {/* Show edit hint for PDF/doc files with minimal data */}
                  {receipt.filename && isPdfOrDoc(receipt.filename) && (receipt.vendor === 'PDF Receipt' || receipt.amount === '0') && (
                    <span className="text-xs text-yellow-400 italic">← Click edit to add details</span>
                  )}
                </div>
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
    </>
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
  const { toast } = useToast();

  // State management
  const [showPhotoCarousel, setShowPhotoCarousel] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [showEstimateGenerator, setShowEstimateGenerator] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
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
    { id: 'receipts', name: 'Receipts & Expenses', icon: DollarSign },
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
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [hoursInput, setHoursInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [editingHours, setEditingHours] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editDescription, setEditDescription] = useState('');

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

  // Email dialog state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailForm, setEmailForm] = useState({
    subject: '',
    message: ''
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

  // Action mode state for generate buttons toggle
  const [actionMode, setActionMode] = useState<'estimate' | 'invoice'>('invoice');

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
    queryKey: [`/api/projects/${projectId}/daily-hours`],
  });

  // Debug daily hours data
  React.useEffect(() => {
    console.log('Daily hours data:', dailyHours);
    console.log('Daily hours length:', dailyHours.length);
  }, [dailyHours]);

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
      const response = await apiRequest(`/api/projects/${projectId}/daily-hours`, {
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
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/daily-hours`] });
      queryClient.refetchQueries({ queryKey: [`/api/projects/${projectId}/daily-hours`] });
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
      console.error('Invalid hours input:', hoursInput, 'parsed as:', parsedHours);
      return;
    }
    
    console.log('Adding hours:', parsedHours, 'for date:', selectedDate);
    
    // Format the date to ensure it's timezone-safe (YYYY-MM-DD format only)
    let formattedDate = selectedDate;
    if (selectedDate.includes('T')) {
      // If it's an ISO string, extract just the date part
      formattedDate = selectedDate.split('T')[0];
    }
    
    addHoursMutation.mutate({
      projectId,
      date: formattedDate,
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

  // Close calendar popup when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCalendarPopup) {
        const target = event.target as HTMLElement;
        const calendarElement = target.closest('.calendar-popup-container');
        if (!calendarElement) {
          setShowCalendarPopup(false);
        }
      }
    };

    if (showCalendarPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendarPopup]);

  // Close calendar popup when date picker is closed
  React.useEffect(() => {
    if (!showDatePicker) {
      setShowCalendarPopup(false);
    }
  }, [showDatePicker]);

  const handleEditInputChange = (field: string, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = () => {
    editProjectMutation.mutate(editForm);
  };

  // Email functionality
  const sendEmailMutation = useMutation({
    mutationFn: async ({ recipientEmail, subject, message }: { recipientEmail: string; subject: string; message: string }) => {
      const response = await fetch('/api/send-basic-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: subject,
          text: message,
          html: message.replace(/\n/g, '<br>')
        }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send email: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Your email has been sent successfully!",
      });
      setShowEmailDialog(false);
      setEmailForm({ subject: '', message: '' });
    },
    onError: (error) => {
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEmailClient = () => {
    if (!project?.clientEmail) {
      toast({
        title: "No Email Address",
        description: "This client doesn't have an email address. Please add one in the client details.",
        variant: "destructive",
      });
      return;
    }
    setEmailForm({
      subject: '',
      message: ''
    });
    setShowEmailDialog(true);
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
          },
          'photo'  // High quality compression for photos
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
      console.log('Starting receipt upload with', files.length, 'files');
      const results = [];
      
      // Upload files one by one since server expects single file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Uploading receipt ${i + 1}/${files.length}: ${file.name}`);
        
        const formData = new FormData();
        formData.append('receipt', file);

        const response = await fetch(`/api/projects/${projectId}/receipts`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to upload ${file.name}: ${errorText}`);
        }
        
        const result = await response.json();
        results.push(result);
        console.log(`Successfully uploaded ${file.name}:`, result);
      }
      
      return results;
    },
    onSuccess: (results) => {
      console.log('All receipts uploaded successfully:', results);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/receipts`] });
      toast({
        title: "Receipts Uploaded",
        description: `Successfully uploaded ${results.length} receipt${results.length > 1 ? 's' : ''}`,
      });
    },
    onError: (error) => {
      console.error('Receipt upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload receipts. Please try again.",
        variant: "destructive",
      });
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
      await apiRequest(`/api/daily-hours/${hoursId}`, {
        method: 'DELETE',
      });
      
      return hoursId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/daily-hours`] });
      queryClient.refetchQueries({ queryKey: [`/api/projects/${projectId}/daily-hours`] });
    },
    onError: (error) => {
      console.error('Delete hours failed:', error);
    },
  });

  const updateHoursMutation = useMutation({
    mutationFn: async (data: { id: number; date: string; hours: number; description: string }) => {
      // Format the date to ensure it's timezone-safe (YYYY-MM-DD format only)
      let formattedDate = data.date;
      if (data.date.includes('T')) {
        // If it's an ISO string, extract just the date part
        formattedDate = data.date.split('T')[0];
      }
      
      const response = await apiRequest(`/api/daily-hours/${data.id}`, {
        method: 'PUT',
        body: {
          date: formattedDate,
          hours: data.hours,
          description: data.description,
        },
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/daily-hours`] });
      queryClient.refetchQueries({ queryKey: [`/api/projects/${projectId}/daily-hours`] });
      setEditingHours(null);
      setEditDate('');
      setEditHours('');
      setEditDescription('');
    },
    onError: (error) => {
      console.error('Update hours failed:', error);
    },
  });



  // File upload handlers
  const handlePhotoUpload = (event: any) => {
    console.log('Photo upload handler triggered');
    const files = event.target.files;
    console.log('Selected files:', files);
    if (files && files.length > 0) {
      console.log('Files detected, starting upload:', Array.from(files).map((f: any) => f.name));
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
      console.log('Receipt files detected, starting upload:', Array.from(files).map((f: any) => f.name));
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
            onClick={() => openWorkCalendar(project, setShowCalendar)}
            className="p-2 transition-colors"
            style={{ color: paintBrainColors.blue }}
            title="Add to calendar"
          >
            <Calendar size={20} />
          </button>
          <button
            onClick={() => {
              const addressParts = [project.address, project.clientCity, project.clientPostal].filter(Boolean);
              const fullAddress = encodeURIComponent(addressParts.join(', '));
              window.open(`https://www.google.com/maps/search/?api=1&query=${fullAddress}`, '_blank');
            }}
            className="p-2 transition-colors relative"
            title="View on maps"
          >
            <div className="relative">
              <MapPin size={20} style={{ color: paintBrainColors.green }} />
              <div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                style={{ backgroundColor: paintBrainColors.red, marginTop: '-2px' }}
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
          
          {/* Client Contact Icons */}
          {(project.clientEmail || project.clientPhone) && (
            <div className="flex items-center gap-3 mt-3">
              {project.clientPhone && (
                <button
                  onClick={() => {
                    window.location.href = `tel:${project.clientPhone}`;
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                  style={{ color: paintBrainColors.green }}
                  title={`Call ${project.clientPhone}`}
                >
                  <Phone size={20} />
                </button>
              )}
              {project.clientEmail && (
                <button
                  onClick={handleEmailClient}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                  style={{ color: paintBrainColors.purple }}
                  title={`Email ${project.clientEmail}`}
                >
                  <Mail size={20} />
                </button>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowEditClient(true)}
          className="absolute bottom-2 right-4 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          style={{ color: paintBrainColors.red }}
          title="Edit client information"
        >
          <Edit3 size={16} />
        </button>
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
            
            // Update section names for better display and get appropriate color
            const sectionName = section.id === 'photos' ? 'Photos' : 
                                section.id === 'dailyHours' ? 'Hours' :
                                section.id === 'receipts' ? 'Expenses' : section.name;
            const getSectionColor = (sectionId: string) => {
              switch (sectionId) {
                case 'photos': return paintBrainColors.red;       // Red for photo gallery  
                case 'tools': return paintBrainColors.yellow;      // Yellow for tools
                case 'dailyHours': return paintBrainColors.green;  // Green for daily hours
                case 'notes': return paintBrainColors.blue;        // Blue for project notes
                case 'receipts': return paintBrainColors.purple;   // Purple for receipts  
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
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-750 transition-colors min-h-[56px]"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center gap-4 min-h-[32px]">
                    {/* Mac-style Reorder Icon - Left Side */}
                    <div className="drag-handle cursor-move p-1 hover:opacity-80 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ color: getSectionColor(section.id) }}>
                        <rect y="2" width="16" height="1.5" rx="0.75"/>
                        <rect y="5.5" width="16" height="1.5" rx="0.75"/>
                        <rect y="9" width="16" height="1.5" rx="0.75"/>
                        <rect y="12.5" width="16" height="1.5" rx="0.75"/>
                      </svg>
                    </div>
                    
                    <div className="flex items-center">
                      <IconComponent size={20} style={{ color: getSectionColor(section.id) }} />
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium" style={{ color: getSectionColor(section.id) }}>{sectionName}</span>
                    </div>
                    
                    {/* Enhanced Data Status Badge */}
                    {itemCount > 0 && (
                      <div className="flex items-center ml-3">
                        <span 
                          className="text-white text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap"
                          style={{ 
                            backgroundColor: getSectionColor(section.id),
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
                          }}
                        >
                      {(() => {
                        switch(section.id) {
                          case 'photos': 
                            return `${itemCount} photo${itemCount !== 1 ? 's' : ''}`;
                          case 'tools': 
                            return `${itemCount} tool${itemCount !== 1 ? 's' : ''}`;
                          case 'dailyHours': {
                            const totalHours = dailyHours.reduce((sum, entry) => sum + (typeof entry.hours === 'number' ? entry.hours : parseFloat(entry.hours) || 0), 0);
                            const totalEarnings = dailyHours.reduce((sum, h) => sum + ((typeof h.hours === 'number' ? h.hours : parseFloat(h.hours) || 0) * (h.hourlyRate || project?.hourlyRate || 60)), 0);
                            return `${totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)} hrs • $${totalEarnings.toLocaleString()}`;
                          }
                          case 'receipts': 
                            return `${itemCount} receipt${itemCount !== 1 ? 's' : ''}`;
                          default: 
                            return itemCount.toString();
                        }
                      })()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Large Expand Indicator - Right Side with Left-Pointing Arrow */}
                  <div className={`ml-auto transform transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                    <svg width="32" height="32" viewBox="0 0 48 48" fill="currentColor" style={{ color: getSectionColor(section.id) }}>
                      <path d="M14 16l12 8-12 8z"/>
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
                          <div className="flex justify-center mb-4">
                            <button
                              onClick={() => setShowDatePicker(true)}
                              className="px-4 py-2 text-sm text-white border-0 rounded-md font-medium inline-flex items-center"
                              style={{ backgroundColor: '#6A9955', borderColor: '#6A9955', border: 'none' }}
                            >
                              <Plus size={14} className="mr-1" />
                              Hours
                            </button>
                          </div>
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
                              <div className="relative calendar-popup-container">
                                <input
                                  type="text"
                                  readOnly
                                  value={selectedDate ? new Date(selectedDate).toLocaleDateString() : ''}
                                  onClick={() => setShowCalendarPopup(true)}
                                  placeholder="Click to select date"
                                  className="w-full px-3 py-2 text-sm border border-gray-600 rounded-lg bg-gray-800 text-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 cursor-pointer"
                                />
                                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                                {showCalendarPopup && (
                                  <div 
                                    className="absolute top-full left-0 mt-1 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2"
                                    onMouseDown={(e) => e.stopPropagation()} // Prevent calendar from closing when clicking inside
                                  >
                                    <PaintBrainCalendar
                                      selectedDate={selectedDate}
                                      onDateSelect={(date) => {
                                        setSelectedDate(date);
                                        setShowCalendarPopup(false);
                                        setTimeout(() => {
                                          const hoursInput = document.querySelector('input[placeholder=""]') as HTMLInputElement;
                                          if (hoursInput) hoursInput.focus();
                                        }, 100);
                                      }}
                                      maxDate={formatDateForInput(new Date())}
                                      className="w-full"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium mb-2 block text-gray-200">Hours Worked</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={hoursInput}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Allow empty, digits, or digits with one decimal point
                                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    setHoursInput(value);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && hoursInput) {
                                    handleAddHours();
                                  }
                                }}
                                placeholder=""
                                className="w-full px-3 py-2 text-sm border border-gray-600 rounded-lg bg-gray-800 text-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500"
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
                                {editingHours === hours.id ? (
                                  // Edit form
                                  <div className="space-y-3">
                                    {/* Date picker using our custom calendar */}
                                    <div className="space-y-2">
                                      <div className="text-sm text-gray-300">Edit Date:</div>
                                      <PaintBrainCalendar
                                        selectedDate={editDate}
                                        onDateSelect={(date) => {
                                          setEditDate(date);
                                          // Close the edit form after date selection to provide feedback
                                          if (date) {
                                            setTimeout(() => {
                                              const editHoursInput = document.querySelector('input[placeholder="Enter new hours"]') as HTMLInputElement;
                                              if (editHoursInput) editHoursInput.focus();
                                            }, 100);
                                          }
                                        }}
                                        maxDate={new Date().toISOString().split('T')[0]}
                                      />
                                    </div>
                                    
                                    {/* Hours and Description */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input
                                        type="text"
                                        pattern="[0-9]+(\.[0-9]*)?"
                                        inputMode="decimal"
                                        value={editHours}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          // Allow only numbers and one decimal point
                                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                            setEditHours(value);
                                          }
                                        }}
                                        placeholder=""
                                        className="text-sm bg-gray-700 border-gray-600 text-gray-200"
                                      />
                                      <Input
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        placeholder=""
                                        className="text-sm bg-gray-700 border-gray-600 text-gray-200"
                                      />
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => {
                                          updateHoursMutation.mutate({
                                            id: hours.id,
                                            date: editDate,
                                            hours: parseFloat(editHours),
                                            description: editDescription,
                                          });
                                        }}
                                        disabled={updateHoursMutation.isPending || !editDate || !editHours}
                                        className="flex-1 text-sm py-1 h-8"
                                        style={{ backgroundColor: paintBrainColors.green }}
                                      >
                                        {updateHoursMutation.isPending ? 'Saving...' : 'Save'}
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          setEditingHours(null);
                                          setEditDate('');
                                          setEditHours('');
                                          setEditDescription('');
                                        }}
                                        variant="outline"
                                        className="flex-1 text-sm py-1 h-8 border-gray-600 text-gray-300"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  // Display mode - compact two-line layout
                                  <div className="space-y-1">
                                    {/* First line: Date - Description - Hours - Money */}
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-blue-300">
                                          {(() => {
                                            try {
                                              const date = new Date(hours.date);
                                              const monthName = date.toLocaleDateString('en-US', { month: 'long' });
                                              const day = date.getDate();
                                              
                                              // Abbreviate long month names (keep March, April, May, June, July full)
                                              const monthAbbreviation = {
                                                'January': 'Jan',
                                                'February': 'Feb',
                                                'August': 'Aug',
                                                'September': 'Sep',
                                                'October': 'Oct',
                                                'November': 'Nov',
                                                'December': 'Dec'
                                              }[monthName] || monthName;
                                              
                                              return `${monthAbbreviation} ${day}`;
                                            } catch {
                                              return 'Invalid Date';
                                            }
                                          })()}
                                        </span>
                                        <span className="text-gray-400">-</span>
                                        <span className="text-gray-200">
                                          {hours.description || 'painting'}
                                        </span>
                                        <span className="text-gray-400">-</span>
                                        <span className="font-semibold text-green-400">
                                          {hours.hours} hrs
                                        </span>
                                      </div>
                                      <span className="font-bold text-green-300">
                                        ${(hours.hours * (project?.hourlyRate || 60)).toFixed(0)}
                                      </span>
                                    </div>
                                    
                                    {/* Second line: Edit/Delete buttons */}
                                    <div className="flex justify-end gap-1 pt-1">
                                      <button
                                        onClick={() => {
                                          setEditingHours(hours.id);
                                          setEditDate(typeof hours.date === 'string' ? String(hours.date).split('T')[0] : new Date(hours.date).toISOString().split('T')[0]);
                                          setEditHours(hours.hours.toString());
                                          setEditDescription(hours.description || '');
                                        }}
                                        className="px-2 py-1 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-gray-700/40 rounded hover:bg-gray-600/40"
                                        title="Edit"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => deleteHoursMutation.mutate(hours.id)}
                                        disabled={deleteHoursMutation.isPending}
                                        className="px-2 py-1 text-xs text-red-400 hover:text-red-300 transition-colors bg-gray-700/40 rounded hover:bg-gray-600/40"
                                        title="Delete"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        {/* Hours Summary at Bottom - Always reserve space */}
                        <div className="mt-4">
                          {dailyHours.length > 0 ? (
                            <div className="p-3 bg-green-900/20 rounded-lg border border-green-700">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-green-300 text-sm">
                                  {(() => {
                                    const totalHours = dailyHours.reduce((sum, h) => sum + (typeof h.hours === 'number' ? h.hours : parseFloat(h.hours) || 0), 0);
                                    return `Total Hours: ${totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)} hrs`;
                                  })()}
                                </span>
                                <span className="font-bold text-green-300 text-base">
                                  {(() => {
                                    const totalCost = dailyHours.reduce((sum, h) => sum + ((typeof h.hours === 'number' ? h.hours : parseFloat(h.hours) || 0) * (h.hourlyRate || project?.hourlyRate || 60)), 0);
                                    return `$${totalCost.toLocaleString()}`;
                                  })()}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 opacity-0 pointer-events-none">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-green-300 text-sm">Total Hours: 0 hrs</span>
                                <span className="font-bold text-green-300 text-base">$0</span>
                              </div>
                            </div>
                          )}
                        </div>
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
                              input.accept = 'image/*,.heic,.heif,.pdf,.doc,.docx,.txt';
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
                              input.accept = 'image/*,.heic,.heif,.pdf,.doc,.docx,.txt';
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
        
        <div className="mt-4 text-white flex justify-center">
          <span className="text-sm flex items-center gap-1" style={{ color: paintBrainColors.yellow }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ color: paintBrainColors.yellow }}>
              <rect y="2" width="16" height="1.5" rx="0.75"/>
              <rect y="5.5" width="16" height="1.5" rx="0.75"/>
              <rect y="9" width="16" height="1.5" rx="0.75"/>
              <rect y="12.5" width="16" height="1.5" rx="0.75"/>
            </svg>
            Drag to re-order
          </span>
        </div>
      </div>

      {/* Generate Buttons with Toggle */}
      <div className="space-y-4">
        {/* Toggle Switch */}
        <div className="flex justify-center">
          <div 
            className="relative bg-gray-700 rounded-full p-1 flex items-center w-64 border-2 transition-colors duration-300"
            style={{
              borderColor: actionMode === 'invoice' ? paintBrainColors.purple : '#EA580C'
            }}
          >
            {/* Slider Background */}
            <div 
              className="absolute h-10 rounded-full transition-all duration-300 ease-in-out z-10"
              style={{
                backgroundColor: actionMode === 'invoice' ? paintBrainColors.purple : '#EA580C',
                width: '124px',
                left: actionMode === 'invoice' ? '4px' : '126px'
              }}
            />
            
            {/* Toggle Buttons with Icons */}
            <div className="relative flex w-full z-30">
              <button
                onClick={() => setActionMode('invoice')}
                className="flex-1 h-10 flex items-center justify-center text-sm font-medium text-white transition-all duration-200 gap-2"
              >
                <FileText className="h-4 w-4" />
                Invoice
              </button>
              <button
                onClick={() => setActionMode('estimate')}
                className="flex-1 h-10 flex items-center justify-center text-sm font-medium text-white transition-all duration-200 gap-2"
              >
                <Calculator className="h-4 w-4" />
                Estimate
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button
            onClick={() => {
              if (actionMode === 'estimate') {
                setShowEstimateGenerator(true);
              } else {
                setShowInvoiceGenerator(true);
              }
            }}
            className="py-3 px-4 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: actionMode === 'estimate' ? '#EA580C' : paintBrainColors.purple }}
          >
          Generate
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client Information</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
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

      {/* Email Client Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Email {project?.clientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                placeholder="Enter your message..."
                rows={8}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowEmailDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (project?.clientEmail && emailForm.subject && emailForm.message) {
                    sendEmailMutation.mutate({
                      recipientEmail: project.clientEmail,
                      subject: emailForm.subject,
                      message: emailForm.message
                    });
                  }
                }}
                disabled={!emailForm.subject || !emailForm.message || sendEmailMutation.isPending}
                style={{ backgroundColor: paintBrainColors.purple }}
              >
                {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dark Mode Calendar */}
      <DarkModeCalendar
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        onCreateEvent={(project) => {
          if (project) {
            const eventTitle = `${project.clientName} - ${project.projectType}`;
            const eventLocation = `${project.address}, ${project.clientCity || ''}`;
            const createEventUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&location=${encodeURIComponent(eventLocation)}&details=${encodeURIComponent(`Client: ${project.clientName}\nProject: ${project.projectType}`)}&cid=6b990af5658408422c42677572f2ef19740096a1608165f15f59135db4f2a981@group.calendar.google.com`;
            window.open(createEventUrl, '_blank');
          }
        }}
        project={project}
      />

    </div>
  );
}