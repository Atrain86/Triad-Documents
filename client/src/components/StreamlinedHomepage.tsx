import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, MapPin, Clock, User, Trash2, ChevronDown, Archive, RotateCcw, Edit3, ExternalLink, Navigation, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { generateMapsLink, generateDirectionsLink } from '@/lib/maps';
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
    dot: 'bg-green-500', 
    text: 'text-green-600 dark:text-green-400',
    label: 'In Progress',
    color: '#10b981',
    priority: 1,
    icon: '🟢'
  },
  'scheduled': { 
    dot: 'bg-blue-500', 
    text: 'text-blue-600 dark:text-blue-400',
    label: 'Scheduled',
    color: '#3b82f6',
    priority: 2,
    icon: '🔵'
  },
  'estimate-sent': { 
    dot: 'bg-amber-500', 
    text: 'text-amber-600 dark:text-amber-400',
    label: 'Estimate Sent',
    color: '#f59e0b',
    priority: 3,
    icon: '📝'
  },
  'awaiting-confirmation': { 
    dot: 'bg-orange-500', 
    text: 'text-orange-600 dark:text-orange-400',
    label: 'Awaiting Confirmation',
    color: '#f97316',
    priority: 4,
    icon: '⏳'
  },
  'site-visit-needed': { 
    dot: 'bg-purple-500', 
    text: 'text-purple-600 dark:text-purple-400',
    label: 'Site Visit Needed',
    color: '#8b5cf6',
    priority: 5,
    icon: '📍'
  },
  'initial-contact': { 
    dot: 'bg-gray-500', 
    text: 'text-gray-600 dark:text-gray-400',
    label: 'Initial Contact',
    color: '#6b7280',
    priority: 6,
    icon: '📞'
  },
  'follow-up-needed': { 
    dot: 'bg-lime-500', 
    text: 'text-lime-600 dark:text-lime-400',
    label: 'Follow-up Needed',
    color: '#84cc16',
    priority: 7,
    icon: '🔄'
  },
  'on-hold': { 
    dot: 'bg-slate-500', 
    text: 'text-slate-600 dark:text-slate-400',
    label: 'On Hold',
    color: '#64748b',
    priority: 8,
    icon: '⏸️'
  },
  'pending': { 
    dot: 'bg-yellow-500', 
    text: 'text-yellow-600 dark:text-yellow-400',
    label: 'Pending',
    color: '#f59e0b',
    priority: 9,
    icon: '🟡'
  },
  'completed': { 
    dot: 'bg-orange-600', 
    text: 'text-orange-600 dark:text-orange-400',
    label: 'Completed',
    color: '#ea580c',
    priority: 10,
    icon: '✅'
  },
  'archived': { 
    dot: 'bg-gray-500', 
    text: 'text-gray-600 dark:text-gray-400',
    label: 'Archived',
    color: '#6b7280',
    priority: 11,
    icon: '📦'
  },
  'cancelled': { 
    dot: 'bg-gray-800', 
    text: 'text-gray-800 dark:text-gray-600',
    label: 'Cancelled',
    color: '#374151',
    priority: 12,
    icon: '❌'
  },
  // Fallback for any legacy status values
  'estimating': { 
    dot: 'bg-yellow-500', 
    text: 'text-yellow-600 dark:text-yellow-400',
    label: 'Estimating',
    color: '#f59e0b',
    priority: 9,
    icon: '🟡'
  }
};

// Context-aware calendar function with your A-Frame calendar ONLY
const openWorkCalendar = (clientContext: Project | null = null) => {
  // Direct link to ONLY your A-Frame calendar with Vancouver timezone, dark mode, and proper display settings
  const aframeCalendarOnlyUrl = 'https://calendar.google.com/calendar/embed?src=6b990af5658408422c42677572f2ef19740096a1608165f15f59135db4f2a981%40group.calendar.google.com&ctz=America%2FVancouver&mode=WEEK&showTitle=1&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0&bgcolor=%23000000&color=%23ffffff';
  
  if (clientContext) {
    // When opened from client details, create new event in A-Frame calendar
    const eventTitle = `${clientContext.clientName} - ${clientContext.projectType}`;
    const eventLocation = `${clientContext.address}, ${clientContext.clientCity || ''}`;
    
    // Create event specifically in your A-Frame calendar
    const createEventUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&location=${encodeURIComponent(eventLocation)}&details=${encodeURIComponent(`Client: ${clientContext.clientName}\nProject: ${clientContext.projectType}`)}&cid=6b990af5658408422c42677572f2ef19740096a1608165f15f59135db4f2a981@group.calendar.google.com`;
    
    window.open(createEventUrl, '_blank');
  } else {
    // From homepage - open ONLY your A-Frame work calendar (isolated view with dark mode)
    // This direct URL shows just the A-Frame calendar without your other calendars
    const workCalendarDirectUrl = 'https://calendar.google.com/calendar/u/0?cid=NmI5OTBhZjU2NTg0MDg0MjJjNDI2Nzc1NzJmMmVmMTk3NDAwOTZhMTYwODE2NWYxNWY1OTEzNWRiNGYyYTk4MUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%23039BE5&bgcolor=%23000000';
    window.open(workCalendarDirectUrl, '_blank');
  }
};

// Smart sorting function
const sortProjectsByPriorityAndDate = (projectList: Project[]) => {
  return [...projectList].sort((a, b) => {
    const statusA = statusConfig[a.status as keyof typeof statusConfig] || { priority: 99 };
    const statusB = statusConfig[b.status as keyof typeof statusConfig] || { priority: 99 };
    
    if (statusA.priority !== statusB.priority) {
      return statusA.priority - statusB.priority;
    }
    
    return a.clientName.localeCompare(b.clientName);
  });
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
    clientCity: '',
    clientPostal: '',
    clientEmail: '',
    clientPhone: '',
    projectType: 'exterior',
    roomCount: 1,
    difficulty: 'medium',
    hourlyRate: 60
  });

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Filter and sort projects based on archive status, search term, and priority
  const filteredProjects = sortProjectsByPriorityAndDate(
    projects.filter(project => {
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
        project.projectType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (statusConfig[project.status as keyof typeof statusConfig] && statusConfig[project.status as keyof typeof statusConfig].label.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    })
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
      <div className="p-6">
        <div className="flex justify-center mb-6">
          <img 
            src="/aframe-logo.png" 
            alt="A-Frame Painting" 
            className="h-32 w-auto object-contain"
          />
        </div>

        {/* Rainbow gradient divider */}
        <div 
          className="h-1 w-full mb-8"
          style={{ background: aframeTheme.gradients.rainbow }}
        />

        <div className="flex justify-center gap-4 mb-6">
          <Button
            onClick={() => setShowAddClient(true)}
            className="px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: '#4F46E5' }}
          >
            New Client
          </Button>
          
          <Button
            onClick={() => openWorkCalendar()}
            className="flex items-center px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: '#3b82f6' }}
          >
            Work Schedule
          </Button>
        </div>

        {/* Search Bar and Archive Toggle */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search clients"
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
                    <option value="in-progress">🟢 In Progress</option>
                    <option value="scheduled">🔵 Scheduled</option>
                    <option value="estimate-sent">📝 Estimate Sent</option>
                    <option value="awaiting-confirmation">⏳ Awaiting Confirmation</option>
                    <option value="site-visit-needed">📍 Site Visit Needed</option>
                    <option value="initial-contact">📞 Initial Contact</option>
                    <option value="follow-up-needed">🔄 Follow-up Needed</option>
                    <option value="on-hold">⏸️ On Hold</option>
                    <option value="pending">🟡 Pending</option>
                    <option value="completed">✅ Completed</option>
                    <option value="cancelled">❌ Cancelled</option>
                    <option value="archived">📦 Archived</option>
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
            
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="City"
                value={newProject.clientCity || ''}
                onChange={(e) => handleInputChange('clientCity', e.target.value)}
              />
              <Input
                placeholder="Postal Code"
                value={newProject.clientPostal || ''}
                onChange={(e) => handleInputChange('clientPostal', e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Email Address"
                type="email"
                value={newProject.clientEmail || ''}
                onChange={(e) => handleInputChange('clientEmail', e.target.value)}
              />
              <Input
                placeholder="Phone Number"
                type="tel"
                value={newProject.clientPhone || ''}
                onChange={(e) => handleInputChange('clientPhone', e.target.value)}
              />
            </div>
            
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