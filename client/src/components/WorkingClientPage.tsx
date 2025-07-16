import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, Trash2, Camera, Plus, FileText, Calendar, Wrench, Receipt as ReceiptIcon, MapPin, Edit } from 'lucide-react';
import type { Project, Photo, Receipt, DailyHours, ToolsChecklist } from '@shared/schema';
import { compressImage } from '@/lib/imageCompression';

interface WorkingClientPageProps {
  projectId: number;
  onBack: () => void;
}

export default function WorkingClientPage({ projectId, onBack }: WorkingClientPageProps) {
  const queryClient = useQueryClient();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // All state variables declared first
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [newTool, setNewTool] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [hoursInput, setHoursInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isEditingClient, setIsEditingClient] = useState(false);
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

  // Queries
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

  // Helper functions
  const clearSelection = () => {
    setSelectedPhotos(new Set());
    setIsSelecting(false);
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Mutations
  const photoUploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const compressedFiles: File[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedFile = await compressImage(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.8,
        });
        compressedFiles.push(compressedFile);
      }

      const formData = new FormData();
      compressedFiles.forEach(file => {
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
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoIds: number[]) => {
      const deletePromises = photoIds.map(id => 
        fetch(`/api/photos/${id}`, { method: 'DELETE' })
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
      clearSelection();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
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
          hourlyRate: project?.hourlyRate || 60,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add hours: ${response.status} - ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      setShowDatePicker(false);
      setSelectedDate('');
      setHoursInput('');
      setDescriptionInput('');
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/hours`] });
    },
  });

  const addToolMutation = useMutation({
    mutationFn: async (toolName: string) => {
      const response = await fetch(`/api/projects/${projectId}/tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toolName }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add tool');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setNewTool('');
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tools`] });
    },
  });

  const deleteToolMutation = useMutation({
    mutationFn: async (toolId: number) => {
      const response = await fetch(`/api/tools/${toolId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete tool');
      }
      
      return toolId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tools`] });
    },
  });

  // Event handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      photoUploadMutation.mutate(e.target.files);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedPhotos.size > 0) {
      deletePhotoMutation.mutate(Array.from(selectedPhotos));
    }
  };

  const handleAddHours = () => {
    if (!selectedDate || !hoursInput) return;
    
    const parsedHours = parseFloat(hoursInput);
    if (isNaN(parsedHours) || parsedHours <= 0) return;

    addHoursMutation.mutate({
      projectId,
      date: selectedDate,
      hours: parsedHours,
      description: descriptionInput.trim() || 'Painting',
    });
  };

  const handleAddTool = () => {
    if (newTool.trim()) {
      addToolMutation.mutate(newTool.trim());
    }
  };

  // Effects
  useEffect(() => {
    if (project) {
      setNotes(project.notes || '');
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

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={onBack} variant="ghost" size="sm" className="text-white hover:bg-gray-800">
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
          <CardTitle className="text-white flex items-center justify-between">
            <span>Photos ({photos.length})</span>
            {selectedPhotos.size > 0 && (
              <Button
                onClick={handleDeleteSelected}
                size="sm"
                variant="destructive"
                disabled={deletePhotoMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedPhotos.size})
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploadMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Camera className="w-4 h-4 mr-2" />
              {photoUploadMutation.isPending ? 'Uploading...' : 'Add Photos'}
            </Button>

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
                    className={`w-full h-24 object-cover rounded border cursor-pointer ${
                      selectedPhotos.has(photo.id) ? 'border-blue-500 border-2' : 'border-gray-600'
                    }`}
                    onClick={() => {
                      const newSelected = new Set(selectedPhotos);
                      if (newSelected.has(photo.id)) {
                        newSelected.delete(photo.id);
                      } else {
                        newSelected.add(photo.id);
                      }
                      setSelectedPhotos(newSelected);
                      setIsSelecting(newSelected.size > 0);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tools Section */}
      <Card className="mb-6 bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Tools Checklist ({tools.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTool}
                onChange={(e) => setNewTool(e.target.value)}
                placeholder="Paint brushes, Drop cloths, Ladder, Rollers..."
                className="bg-gray-800 border-gray-600 text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTool();
                  }
                }}
              />
              <Button
                onClick={handleAddTool}
                disabled={!newTool.trim() || addToolMutation.isPending}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {tools.map((tool) => (
                <div key={tool.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <span className="text-gray-200">{tool.toolName}</span>
                  <Button
                    onClick={() => deleteToolMutation.mutate(tool.id)}
                    size="sm"
                    variant="ghost"
                    className="text-green-400 hover:bg-green-900/20"
                    disabled={deleteToolMutation.isPending}
                  >
                    ✓ Complete
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Hours Section */}
      <Card className="mb-6 bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Daily Hours ({dailyHours.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!showDatePicker && (
              <Button
                onClick={() => setShowDatePicker(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Log Hours for a Day
              </Button>
            )}

            {showDatePicker && (
              <div className="p-4 bg-gray-800 rounded-lg space-y-3 border border-gray-600">
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-200">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-600 rounded-lg bg-gray-800 text-gray-200"
                    max={formatDateForInput(new Date())}
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
                    placeholder="Painting"
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

            <div className="space-y-2">
              {dailyHours.map((hours) => (
                <div key={hours.id} className="p-3 bg-gray-800 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white font-medium">
                        {new Date(hours.date).toLocaleDateString()} - {hours.hours}hr
                      </div>
                      <div className="text-gray-400 text-sm">
                        {hours.description}
                      </div>
                    </div>
                    <div className="text-green-400 font-medium">
                      ${(hours.hours * (project?.hourlyRate || 60)).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Notes */}
      <Card className="mb-6 bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Project Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add project notes..."
            className="min-h-32 bg-gray-800 border-gray-600 text-white"
          />
        </CardContent>
      </Card>
    </div>
  );
}