import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, MapPin, Clock, User, Trash2, ChevronDown, Archive, RotateCcw, Edit3 } from 'lucide-react';
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
  'archived': { 
    dot: 'bg-gray-500', 
    text: 'text-gray-600 dark:text-gray-400',
    label: 'Archived'
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
  const [showArchived, setShowArchived] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<Partial<InsertProject>>({});
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

  // Filter projects based on archive status and search term
  const filteredProjects = projects.filter(project => {
    // First filter by archive status
    const isArchived = project.status === 'archived';
    if (showArchived !== isArchived) {
      return false;
    }
    
    // Then filter by search term
    if (!searchTerm) return true;
    
    return (
      project.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectType?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: number, status: string }) => {
      const response = await apiRequest('PUT', `/api/projects/${projectId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest('DELETE', `/api/projects/${projectId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<InsertProject> }) => {
      const response = await apiRequest('PUT', `/api/projects/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setEditingProject(null);
      setEditForm({});
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

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditForm({
      clientName: project.clientName,
      address: project.address,
      projectType: project.projectType,
      roomCount: project.roomCount,
      difficulty: project.difficulty,
      hourlyRate: project.hourlyRate
    });
  };

  const handleEditInputChange = (field: keyof InsertProject, value: string | number) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateProject = () => {
    if (editingProject && editForm.clientName && editForm.address) {
      updateProjectMutation.mutate({ id: editingProject.id, updates: editForm });
    }
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
        <div className="flex justify-center mb-8 pb-5 border-b border-border">
          <div className="flex items-center">
            <div className="flex flex-col mr-2">
              <div className="w-1 h-4 bg-red-500 rounded-sm"></div>
              <div className="w-1 h-4 bg-orange-500 rounded-sm -mt-0.5"></div>
              <div className="w-1 h-4 bg-yellow-500 rounded-sm -mt-0.5"></div>
              <div className="w-1 h-4 bg-blue-500 rounded-sm -mt-0.5"></div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">A-FRAME PAINTING</h1>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <Button
            onClick={() => setShowAddClient(true)}
            className="px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: '#6366F1' }}
          >
            <Plus size={18} className="mr-2" />
            New Client
          </Button>
        </div>

        {/* Search Bar and Archive Toggle */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search clients, addresses, or project types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-3"
            />
          </div>
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-3 ${showArchived ? 'bg-gray-600 hover:bg-gray-700' : ''}`}
          >
            {showArchived ? 'Active' : 'Archive'}
          </Button>
        </div>

        {/* Project Count */}
        {projects.length > 0 && (
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredProjects.length} {showArchived ? 'archived' : 'active'} project{filteredProjects.length !== 1 ? 's' : ''}
              {searchTerm && ` matching "${searchTerm}"`}
              {projects.length > filteredProjects.length && ` (${projects.length} total)`}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {filteredProjects.map(project => (
            <Card
              key={project.id}
              className="p-5 transition-all hover:shadow-md hover:border-primary/50 bg-card relative group"
            >
              <div 
                className="cursor-pointer"
                onClick={() => onSelectProject(project.id)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={16} className="text-muted-foreground" />
                      <h3 className="font-semibold text-lg text-blue-600 dark:text-blue-400">
                        {project.clientName || 'Unnamed Client'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <MapPin size={14} className="text-muted-foreground" />
                      <p className="text-green-600 dark:text-green-400">{project.address || 'No address'}</p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Edit Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProject(project);
                      }}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded"
                      title="Edit client"
                    >
                      <Edit3 size={16} />
                    </button>
                    
                    {/* Archive Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newStatus = project.status === 'archived' ? 'completed' : 'archived';
                        const action = project.status === 'archived' ? 'restore' : 'archive';
                        if (confirm(`Are you sure you want to ${action} ${project.clientName || 'this client'}?`)) {
                          updateStatusMutation.mutate({ projectId: project.id, status: newStatus });
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded"
                      title={project.status === 'archived' ? 'Restore client' : 'Archive client'}
                    >
                      {project.status === 'archived' ? <RotateCcw size={16} /> : <Archive size={16} />}
                    </button>
                    
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete ${project.clientName || 'this client'}?`)) {
                          deleteProjectMutation.mutate(project.id);
                        }
                      }}
                      className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Delete client"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="capitalize">{project.projectType}</span>
                  {project.projectType === 'interior' && (
                    <>
                      <span>•</span>
                      <span>{project.roomCount} room{project.roomCount !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>
                
                {/* Status Selector */}
                <div className="flex items-center gap-2">
                  <select
                    value={project.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateStatusMutation.mutate({ 
                        projectId: project.id, 
                        status: e.target.value 
                      });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-xs font-medium border-none bg-transparent cursor-pointer focus:outline-none ${statusConfig[project.status as keyof typeof statusConfig]?.text || 'text-gray-600 dark:text-gray-400'}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <div 
                    className={`w-3 h-3 rounded-full ${statusConfig[project.status as keyof typeof statusConfig]?.dot || 'bg-gray-500'}`}
                  />
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

        {projects.length > 0 && filteredProjects.length === 0 && !searchTerm && showArchived && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No archived projects yet. Complete and archive projects to organize your workflow.</p>
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
            
            {newProject.projectType === 'interior' && (
              <Input
                placeholder="Number of Rooms"
                type="number"
                min="1"
                value={newProject.roomCount || 1}
                onChange={(e) => handleInputChange('roomCount', Number(e.target.value))}
              />
            )}
            
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

      {/* Edit Client Dialog */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
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
                onClick={() => setEditingProject(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateProject}
                className="flex-1"
                style={{ backgroundColor: '#6366F1' }}
                disabled={updateProjectMutation.isPending}
              >
                {updateProjectMutation.isPending ? 'Updating...' : 'Update Client'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}