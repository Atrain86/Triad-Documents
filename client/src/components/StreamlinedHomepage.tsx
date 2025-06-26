import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Project {
  id: number;
  name: string;
  clientName: string;
  address: string;
  email: string;
  phone?: string;
  status: 'estimating' | 'in-progress' | 'completed';
  hourlyRate: number;
  createdAt: string;
  updatedAt: string;
}

interface NewProject {
  name: string;
  clientName: string;
  address: string;
  email: string;
  phone: string;
  hourlyRate: number;
}

interface StreamlinedHomepageProps {
  onSelectProject: (projectId: number) => void;
}

const aframeTheme = {
  gradients: {
    rainbow: 'linear-gradient(90deg, hsl(0, 100%, 60%), hsl(30, 100%, 60%), hsl(60, 100%, 60%), hsl(120, 100%, 50%), hsl(210, 100%, 60%))',
    primary: 'linear-gradient(45deg, hsl(210, 100%, 60%), hsl(120, 100%, 50%))'
  }
};

const statusColors = {
  'estimating': 'bg-yellow-500',
  'in-progress': 'bg-green-500',
  'completed': 'bg-blue-500'
};

export default function StreamlinedHomepage({ onSelectProject }: StreamlinedHomepageProps) {
  const [showAddClient, setShowAddClient] = useState(false);
  const [newProject, setNewProject] = useState<NewProject>({
    name: '',
    clientName: '',
    address: '',
    email: '',
    phone: '',
    hourlyRate: 60
  });

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    }
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: NewProject) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });

      if (!response.ok) throw new Error('Failed to create project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowAddClient(false);
      setNewProject({
        name: '',
        clientName: '',
        address: '',
        email: '',
        phone: '',
        hourlyRate: 60
      });
    }
  });

  const handleAddProject = () => {
    if (newProject.name && newProject.clientName && newProject.address) {
      createProjectMutation.mutate(newProject);
    }
  };

  const handleInputChange = (field: keyof NewProject, value: string | number) => {
    setNewProject(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div 
        className="h-1"
        style={{ background: aframeTheme.gradients.rainbow }}
      />

      <div className="p-6">
        <div className="flex items-center mb-8 pb-5 border-b border-border">
          <h1 className="text-2xl font-bold tracking-tight">A-FRAME PAINTING</h1>
        </div>

        <Button
          onClick={() => setShowAddClient(true)}
          className="w-full py-4 text-base font-semibold mb-7"
          style={{ background: aframeTheme.gradients.primary }}
        >
          <Plus size={20} className="mr-2" />
          Add New Client
        </Button>

        <div className="space-y-4">
          {projects.map(project => (
            <Card
              key={project.id}
              className="p-5 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] hover:border-primary/50"
              onClick={() => onSelectProject(project.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semi