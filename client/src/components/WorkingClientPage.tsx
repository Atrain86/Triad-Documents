import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft, Upload, Trash2, Camera, Plus, FileText, Calendar, Wrench,
  Receipt as ReceiptIcon, MapPin, Edit
} from 'lucide-react';
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

  const { data: project } = useQuery<Project>({ queryKey: [`/api/projects/${projectId}`] });
  const { data: photos = [] } = useQuery<Photo[]>({ queryKey: [`/api/projects/${projectId}/photos`] });
  const { data: receipts = [] } = useQuery<Receipt[]>({ queryKey: [`/api/projects/${projectId}/receipts`] });
  const { data: tools = [] } = useQuery<ToolsChecklist[]>({ queryKey: [`/api/projects/${projectId}/tools`] });
  const { data: dailyHours = [] } = useQuery<DailyHours[]>({ queryKey: [`/api/projects/${projectId}/hours`] });

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

        // ✅ Wrap in File to satisfy TS
        const wrapped = new File([compressedFile], file.name, {
          type: compressedFile.type || 'image/jpeg',
        });
        compressedFiles.push(wrapped);
      }

      const formData = new FormData();
      compressedFiles.forEach(file => formData.append('photos', file));

      const response = await fetch(`/api/projects/${projectId}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      if (photoInputRef.current) photoInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoIds: number[]) => {
      const deletePromises = photoIds.map(id =>
        fetch(`/api/photos/${id}`, { method: 'DELETE' })
      );
      const responses = await Promise.all(deletePromises);
      responses.forEach((res, i) => {
        if (!res.ok) throw new Error(`Failed to delete ${photoIds[i]}`);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: hoursData.date,
          hours: hoursData.hours,
          description: hoursData.description,
          hourlyRate: project?.hourlyRate || 60,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName }),
      });
      if (!response.ok) throw new Error('Failed to add tool');
      return response.json();
    },
    onSuccess: () => {
      setNewTool('');
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tools`] });
    },
  });

  const deleteToolMutation = useMutation({
    mutationFn: async (toolId: number) => {
      const res = await fetch(`/api/tools/${toolId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete tool');
      return toolId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tools`] });
    },
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) photoUploadMutation.mutate(e.target.files);
  };

  const handleDeleteSelected = () => {
    if (selectedPhotos.size) deletePhotoMutation.mutate(Array.from(selectedPhotos));
  };

  const handleAddHours = () => {
    if (!selectedDate || !hoursInput) return;
    const parsed = parseFloat(hoursInput);
    if (isNaN(parsed) || parsed <= 0) return;
    addHoursMutation.mutate({
      projectId,
      date: selectedDate,
      hours: parsed,
      description: descriptionInput.trim() || 'Painting',
    });
  };

  const handleAddTool = () => {
    if (newTool.trim()) addToolMutation.mutate(newTool.trim());
  };

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
        difficulty: Number(project.difficulty) || 1, // ✅ Convert safely
        hourlyRate: project.hourlyRate || 0,
      });
    }
  }, [project]);

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* header and all JSX unchanged */}
    </div>
  );
}