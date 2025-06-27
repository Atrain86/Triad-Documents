import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, MapPin, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import type { Project, InsertProject } from '@shared/schema';

type NewProject = InsertProject;

interface StreamlinedHomepageProps {
  onSelectProject: (projectId: number) => void;
}

const aframeTheme = {
  gradients: {
    rainbow: 'linear-gradient(90deg, hsl(0, 100%, 60%), hsl(30, 100%, 60%), hsl(60, 100%, 60%), hsl(120, 100%, 50%), hsl(210, 100%, 60%))',
    primary: 'linear-gradient(45deg, hsl(210, 100%, 60%), hsl(120, 100%, 50%))'
  }
};

const statusConfig = {
  'in-progress': { 
    dot: 'bg-red-500', 
    text: 'text-red-600 dark:text-red-400',
    label: 'In Progress'
  },
  'pending': { 
    dot: 'bg-yellow-500', 
    text: 'text-yellow-600 dark:text-yellow-400',
    label: 'Pending'
  },
  'completed': { 
    dot: 'bg-green-500', 
    text: 'text-green-600 dark:text-green-400',
    label: 'Completed'
  },
  // Fallback for any legacy status values
  'estimating': { 
    dot: 'bg-yellow-500', 
    text: 'text-yellow-600 dark:text-yellow-400',
    label: 'Estimating'
  }
};

export default function StreamlinedHomepage({ onSelectProject }: StreamlinedHomepageProps) {
  const [showAddClient, setShowAddClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProject, setNewProject] = useState<NewProject>({
    clientName: '',
    address: '',
    projectType: 'exterior',
    roomCount: 1,
    difficulty: 'medium',
    hourlyRate: 60
  });

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Filter projects based on search term
  const filteredProjects = projects.filter(project =>
    project.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.projectType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: NewProject) => {
      const response = await apiRequest('POST', '/api/projects', projectData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setShowAddClient(false);
      setNewProject({
        clientName: '',
        address: '',
        projectType: 'exterior',
        roomCount: 1,
        difficulty: 'medium',
        hourlyRate: 60
      });
    }
  });

  const handleAddProject = () => {
    if (newProject.clientName && newProject.address) {
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
          className="w-full py-4 text-base font-semibold mb-6"
          style={{ background: aframeTheme.gradients.primary }}
        >
          <Plus size={20} className="mr-2" />
          Add New Client
        </Button>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Search clients, addresses, or project types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-3"
          />
        </div>

        {/* Project Count */}
        {projects.length > 0 && (
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredProjects.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
              {searchTerm && ` matching "${searchTerm}"`}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {filteredProjects.map(project => (
            <Card
              key={project.id}
              className="p-5 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] hover:border-primary/50 bg-card"
              onClick={() => onSelectProject(project.id)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <User size={16} className="text-muted-foreground" />
                    <h3 className="font-semibold text-lg">{project.clientName || 'Unnamed Client'}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <MapPin size={14} />
                    <p>{project.address || 'No address'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <div 
                    className={`w-3 h-3 rounded-full ${statusConfig[project.status as keyof typeof statusConfig]?.dot || 'bg-gray-500'}`}
                  />
                  <span 
                    className={`text-sm font-medium ${statusConfig[project.status as keyof typeof statusConfig]?.text || 'text-gray-600 dark:text-gray-400'}`}
                  >
                    {statusConfig[project.status as keyof typeof statusConfig]?.label || 'Unknown'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="capitalize">{project.projectType}</span>
                  <span>•</span>
                  <span>{project.roomCount} room{project.roomCount !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span className="font-medium">${project.hourlyRate}/hr</span>
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {project.difficulty} difficulty
                </div>
              </div>
            </Card>
          ))}
        </div>

        {projects.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No projects yet. Add your first client to get started!</p>
          </div>
        )}

        {projects.length > 0 && filteredProjects.length === 0 && searchTerm && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No projects match "{searchTerm}". Try a different search term.</p>
          </div>
        )}
      </div>

      <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="Client Name"
              value={newProject.clientName}
              onChange={(e) => handleInputChange('clientName', e.target.value)}
            />
            
            <Input
              placeholder="Address"
              value={newProject.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
            />
            
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={newProject.projectType}
              onChange={(e) => handleInputChange('projectType', e.target.value)}
            >
              <option value="exterior">Exterior Painting</option>
              <option value="interior">Interior Painting</option>
            </select>
            
            <Input
              placeholder="Number of Rooms"
              type="number"
              min="1"
              value={newProject.roomCount || 1}
              onChange={(e) => handleInputChange('roomCount', Number(e.target.value))}
            />
            
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={newProject.difficulty}
              onChange={(e) => handleInputChange('difficulty', e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            
            <Input
              placeholder="Hourly Rate"
              type="number"
              value={String(newProject.hourlyRate || 60)}
              onChange={(e) => handleInputChange('hourlyRate', Number(e.target.value))}
            />
            
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowAddClient(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddProject}
                className="flex-1"
                style={{ background: aframeTheme.gradients.primary }}
                disabled={createProjectMutation.isPending}
              >
                {createProjectMutation.isPending ? 'Adding...' : 'Add Client'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}