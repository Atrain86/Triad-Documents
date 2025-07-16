import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  User, 
  MapPin, 
  Search, 
  Edit3, 
  Archive, 
  RotateCcw, 
  Trash2,
  GripVertical 
} from "lucide-react";
import { ReactSortable } from 'react-sortablejs';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type Project = {
  id: number;
  userId: number;
  clientName: string;
  address: string;
  clientCity?: string;
  clientPostal?: string;
  clientEmail?: string;
  clientPhone?: string;
  projectType: string;
  roomCount: number;
  difficulty: string;
  hourlyRate: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type NewProject = {
  clientName: string;
  address: string;
  clientCity?: string;
  clientPostal?: string;
  clientEmail?: string;
  clientPhone?: string;
  projectType: string;
  roomCount: number;
  difficulty: string;
  hourlyRate: number;
};

type InsertProject = {
  clientName?: string;
  address?: string;
  clientCity?: string;
  clientPostal?: string;
  clientEmail?: string;
  clientPhone?: string;
  projectType?: string;
  roomCount?: number;
  difficulty?: string;
  hourlyRate?: number;
  status?: string;
};

const aframeTheme = {
  gradients: {
    rainbow: "linear-gradient(to right, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3, #54a0ff)"
  }
};

// Paint Brain Color Palette
const paintBrainColors = {
  purple: '#8B5FBF',    // Purple from code syntax
  orange: '#D4A574',    // Orange from code syntax  
  green: '#6A9955',     // Green from comments
  red: '#F44747',       // Red from HTML tags
  blue: '#569CD6',      // Blue from keywords
  gray: '#6B7280'       // Neutral gray
};

const statusConfig = {
  'in-progress': { 
    label: 'In Progress', 
    text: `text-[${paintBrainColors.green}]`, 
    dot: `bg-[${paintBrainColors.green}]`,
    priority: 1 
  },
  'scheduled': { 
    label: 'Scheduled', 
    text: `text-[${paintBrainColors.blue}]`, 
    dot: `bg-[${paintBrainColors.blue}]`,
    priority: 2 
  },
  'estimate-sent': { 
    label: 'Estimate Sent', 
    text: `text-[${paintBrainColors.purple}]`, 
    dot: `bg-[${paintBrainColors.purple}]`,
    priority: 3 
  },
  'awaiting-confirmation': { 
    label: 'Awaiting Confirmation', 
    text: `text-[${paintBrainColors.orange}]`, 
    dot: `bg-[${paintBrainColors.orange}]`,
    priority: 4 
  },
  'site-visit-needed': { 
    label: 'Site Visit Needed', 
    text: `text-[${paintBrainColors.purple}]`, 
    dot: `bg-[${paintBrainColors.purple}]`,
    priority: 5 
  },
  'initial-contact': { 
    label: 'Initial Contact', 
    text: `text-[${paintBrainColors.blue}]`, 
    dot: `bg-[${paintBrainColors.blue}]`,
    priority: 6 
  },
  'follow-up-needed': { 
    label: 'Follow-up Needed', 
    text: `text-[${paintBrainColors.orange}]`, 
    dot: `bg-[${paintBrainColors.orange}]`,
    priority: 7 
  },
  'on-hold': { 
    label: 'On Hold', 
    text: `text-[${paintBrainColors.gray}]`, 
    dot: `bg-[${paintBrainColors.gray}]`,
    priority: 8 
  },
  'pending': { 
    label: 'Pending', 
    text: `text-[${paintBrainColors.orange}]`, 
    dot: `bg-[${paintBrainColors.orange}]`,
    priority: 9 
  },
  'completed': { 
    label: 'Completed', 
    text: `text-[${paintBrainColors.green}]`, 
    dot: `bg-[${paintBrainColors.green}]`,
    priority: 10 
  },
  'cancelled': { 
    label: 'Cancelled', 
    text: `text-[${paintBrainColors.red}]`, 
    dot: `bg-[${paintBrainColors.red}]`,
    priority: 11 
  },
  'archived': { 
    label: 'Archived', 
    text: `text-[${paintBrainColors.gray}]`, 
    dot: `bg-[${paintBrainColors.gray}]`,
    priority: 12 
  }
};

interface StreamlinedHomepageProps {
  onSelectProject: (projectId: number) => void;
}

export default function StreamlinedHomepage({ onSelectProject }: StreamlinedHomepageProps) {
  const [showAddClient, setShowAddClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<Partial<InsertProject>>({});
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualProjects, setManualProjects] = useState<Project[]>([]);
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

  // Smart sorting function - prioritize by status
  const sortProjectsByPriority = (projectList: Project[]) => {
    return [...projectList].sort((a, b) => {
      const statusA = statusConfig[a.status as keyof typeof statusConfig] || { priority: 99 };
      const statusB = statusConfig[b.status as keyof typeof statusConfig] || { priority: 99 };
      
      // First sort by status priority
      if (statusA.priority !== statusB.priority) {
        return statusA.priority - statusB.priority;
      }
      
      // Then sort alphabetically by client name
      return a.clientName.localeCompare(b.clientName);
    });
  };

  // Filter projects first
  const baseFilteredProjects = projects.filter(project => {
    const isArchived = project.status === 'archived';
    if (showArchived !== isArchived) return false;
    
    if (!searchTerm) return true;
    
    return (
      project.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectType?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Apply sorting or manual order
  const filteredProjects = isManualMode 
    ? manualProjects.filter(project => baseFilteredProjects.some(p => p.id === project.id))
    : sortProjectsByPriority(baseFilteredProjects);

  // Update manual projects when switching to manual mode
  React.useEffect(() => {
    if (isManualMode && manualProjects.length === 0) {
      setManualProjects(sortProjectsByPriority(baseFilteredProjects));
    }
  }, [isManualMode, baseFilteredProjects]);

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
        clientCity: '',
        clientPostal: '',
        clientEmail: '',
        clientPhone: '',
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
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      alert('Failed to delete project. Please try again.');
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

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setEditForm({
      clientName: project.clientName,
      address: project.address,
      clientCity: project.clientCity,
      clientPostal: project.clientPostal,
      clientEmail: project.clientEmail,
      clientPhone: project.clientPhone,
      projectType: project.projectType,
      roomCount: project.roomCount,
      difficulty: project.difficulty,
      hourlyRate: project.hourlyRate
    });
  };

  const openWorkCalendar = () => {
    const workCalendarDirectUrl = 'https://calendar.google.com/calendar/embed?src=6b990af5658408422c42677572f2ef19740096a1608165f15f59135db4f2a981%40group.calendar.google.com&ctz=America%2FVancouver';
    window.open(workCalendarDirectUrl, '_blank');
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

        <div 
          className="h-1 w-full mb-8"
          style={{ background: aframeTheme.gradients.rainbow }}
        />

        <div className="flex justify-center gap-4 mb-6">
          <Button
            onClick={() => setShowAddClient(true)}
            className="px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: paintBrainColors.red }}
          >
            New Client
          </Button>
          
          <Button
            onClick={() => openWorkCalendar()}
            className="flex items-center px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: paintBrainColors.green }}
          >
            Schedule
          </Button>
        </div>

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
            variant={isManualMode ? "default" : "outline"}
            onClick={() => {
              setIsManualMode(!isManualMode);
              if (!isManualMode) {
                setManualProjects(sortProjectsByPriority(baseFilteredProjects));
              }
            }}
            className={`px-3 py-3 text-sm`}
            style={isManualMode ? { backgroundColor: paintBrainColors.purple } : {}}
          >
            {isManualMode ? 'Smart' : 'Manual'}
          </Button>
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-3`}
            style={showArchived ? { backgroundColor: paintBrainColors.gray } : {}}
          >
            {showArchived ? 'Active' : 'Archive'}
          </Button>
        </div>

        {projects.length > 0 && (
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredProjects.length} {showArchived ? 'archived' : 'active'} project{filteredProjects.length !== 1 ? 's' : ''}
              {searchTerm && ` matching "${searchTerm}"`}
              {projects.length > filteredProjects.length && ` (${projects.length} total)`}
            </p>
          </div>
        )}

        {isManualMode ? (
          <ReactSortable 
            list={filteredProjects} 
            setList={(newList) => setManualProjects(newList)}
            animation={150}
            handle=".drag-handle"
            className="space-y-4"
          >
            {filteredProjects.map(project => {
              const handleNavigation = () => {
                console.log('Navigating to project:', project.id);
                onSelectProject(project.id);
              };

              let touchStartY = 0;
              let touchStartTime = 0;
              let hasMoved = false;

              return (
                <Card
                  key={project.id}
                  className="p-5 transition-all hover:shadow-md hover:border-primary/50 bg-card relative group cursor-pointer"
                  onClick={handleNavigation}
                  onTouchStart={(e) => {
                    touchStartY = e.touches[0].clientY;
                    touchStartTime = Date.now();
                    hasMoved = false;
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onTouchMove={(e) => {
                    const currentY = e.touches[0].clientY;
                    const deltaY = Math.abs(currentY - touchStartY);
                    if (deltaY > 10) {
                      hasMoved = true;
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.opacity = '1';
                    const touchDuration = Date.now() - touchStartTime;
                    if (!hasMoved && touchDuration < 300) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNavigation();
                    }
                  }}
                  onTouchCancel={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  style={{ 
                    touchAction: 'pan-y',
                    WebkitTapHighlightColor: 'rgba(0,0,0,0)',
                    WebkitUserSelect: 'none',
                    userSelect: 'none'
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="drag-handle cursor-move text-gray-400 hover:text-gray-600 transition-colors">
                        <GripVertical size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User size={16} className="text-muted-foreground" />
                          <h3 className="font-semibold text-lg" style={{ color: paintBrainColors.purple }}>
                            {project.clientName || 'Unnamed Client'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <MapPin size={14} className="text-muted-foreground" />
                          <p style={{ color: paintBrainColors.green }}>{project.address || 'No address'}</p>
                        </div>
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
                  
                  {/* Action Buttons */}
                  <div className="absolute top-5 right-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newStatus = project.status === 'archived' ? 'completed' : 'archived';
                        const action = project.status === 'archived' ? 'restore' : 'archive';
                        if (confirm(`Are you sure you want to ${action} ${project.clientName || 'this client'}?`)) {
                          updateStatusMutation.mutate({ projectId: project.id, status: newStatus });
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded"
                      title={project.status === 'archived' ? "Restore client" : "Archive client"}
                    >
                      {project.status === 'archived' ? <RotateCcw size={16} /> : <Archive size={16} />}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to permanently delete ${project.clientName || 'this client'}? This cannot be undone.`)) {
                          deleteProjectMutation.mutate(project.id);
                        }
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="p-2 text-gray-500 hover:text-[#F44747] dark:text-gray-400 dark:hover:text-[#F44747] hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded"
                      title="Delete client"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </ReactSortable>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map(project => {
              const handleNavigation = () => {
                console.log('Navigating to project:', project.id);
                onSelectProject(project.id);
              };

              let touchStartY = 0;
              let touchStartTime = 0;
              let hasMoved = false;

              return (
                <Card
                  key={project.id}
                  className="p-5 transition-all hover:shadow-md hover:border-primary/50 bg-card relative group cursor-pointer"
                  onClick={handleNavigation}
                  onTouchStart={(e) => {
                    touchStartY = e.touches[0].clientY;
                    touchStartTime = Date.now();
                    hasMoved = false;
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onTouchMove={(e) => {
                    const currentY = e.touches[0].clientY;
                    const deltaY = Math.abs(currentY - touchStartY);
                    if (deltaY > 10) {
                      hasMoved = true;
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.opacity = '1';
                    const touchDuration = Date.now() - touchStartTime;
                    if (!hasMoved && touchDuration < 300) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNavigation();
                    }
                  }}
                  onTouchCancel={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  style={{ 
                    touchAction: 'pan-y',
                    WebkitTapHighlightColor: 'rgba(0,0,0,0)',
                    WebkitUserSelect: 'none',
                    userSelect: 'none'
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User size={16} className="text-muted-foreground" />
                          <h3 className="font-semibold text-lg" style={{ color: paintBrainColors.purple }}>
                            {project.clientName || 'Unnamed Client'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <MapPin size={14} className="text-muted-foreground" />
                          <p style={{ color: paintBrainColors.green }}>{project.address || 'No address'}</p>
                        </div>
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
                  
                  {/* Action Buttons */}
                  <div className="absolute top-5 right-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newStatus = project.status === 'archived' ? 'completed' : 'archived';
                        const action = project.status === 'archived' ? 'restore' : 'archive';
                        if (confirm(`Are you sure you want to ${action} ${project.clientName || 'this client'}?`)) {
                          updateStatusMutation.mutate({ projectId: project.id, status: newStatus });
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded"
                      title={project.status === 'archived' ? "Restore client" : "Archive client"}
                    >
                      {project.status === 'archived' ? <RotateCcw size={16} /> : <Archive size={16} />}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to permanently delete ${project.clientName || 'this client'}? This cannot be undone.`)) {
                          deleteProjectMutation.mutate(project.id);
                        }
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="p-2 text-gray-500 hover:text-[#F44747] dark:text-gray-400 dark:hover:text-[#F44747] hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded"
                      title="Delete client"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

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
              onChange={(e) => setNewProject(prev => ({ ...prev, clientName: e.target.value }))}
            />
            
            <Input
              placeholder="Address"
              value={newProject.address}
              onChange={(e) => setNewProject(prev => ({ ...prev, address: e.target.value }))}
            />
            
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="City"
                value={newProject.clientCity || ''}
                onChange={(e) => setNewProject(prev => ({ ...prev, clientCity: e.target.value }))}
              />
              <Input
                placeholder="Postal Code"
                value={newProject.clientPostal || ''}
                onChange={(e) => setNewProject(prev => ({ ...prev, clientPostal: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Email"
                type="email"
                value={newProject.clientEmail || ''}
                onChange={(e) => setNewProject(prev => ({ ...prev, clientEmail: e.target.value }))}
              />
              <Input
                placeholder="Phone"
                value={newProject.clientPhone || ''}
                onChange={(e) => setNewProject(prev => ({ ...prev, clientPhone: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <select
                className="px-3 py-2 border rounded-md bg-background text-foreground"
                value={newProject.projectType}
                onChange={(e) => setNewProject(prev => ({ ...prev, projectType: e.target.value }))}
              >
                <option value="exterior">Exterior</option>
                <option value="interior">Interior</option>
                <option value="commercial">Commercial</option>
              </select>
              
              <Input
                type="number"
                placeholder="Room Count"
                value={newProject.roomCount}
                onChange={(e) => setNewProject(prev => ({ ...prev, roomCount: parseInt(e.target.value) || 1 }))}
                min="1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <select
                className="px-3 py-2 border rounded-md bg-background text-foreground"
                value={newProject.difficulty}
                onChange={(e) => setNewProject(prev => ({ ...prev, difficulty: e.target.value }))}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              
              <Input
                type="number"
                placeholder="Hourly Rate"
                value={newProject.hourlyRate}
                onChange={(e) => setNewProject(prev => ({ ...prev, hourlyRate: parseInt(e.target.value) || 60 }))}
                min="1"
              />
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowAddClient(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (newProject.clientName && newProject.address) {
                    createProjectMutation.mutate(newProject);
                  }
                }}
                className="flex-1"
                disabled={!newProject.clientName || !newProject.address}
              >
                Add Client
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="Client Name"
              value={editForm.clientName || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, clientName: e.target.value }))}
            />
            
            <Input
              placeholder="Address"
              value={editForm.address || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
            />
            
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="City"
                value={editForm.clientCity || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, clientCity: e.target.value }))}
              />
              <Input
                placeholder="Postal Code"
                value={editForm.clientPostal || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, clientPostal: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Email"
                type="email"
                value={editForm.clientEmail || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, clientEmail: e.target.value }))}
              />
              <Input
                placeholder="Phone"
                value={editForm.clientPhone || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, clientPhone: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <select
                className="px-3 py-2 border rounded-md bg-background text-foreground"
                value={editForm.projectType || 'exterior'}
                onChange={(e) => setEditForm(prev => ({ ...prev, projectType: e.target.value }))}
              >
                <option value="exterior">Exterior</option>
                <option value="interior">Interior</option>
                <option value="commercial">Commercial</option>
              </select>
              
              <Input
                type="number"
                placeholder="Room Count"
                value={editForm.roomCount || 1}
                onChange={(e) => setEditForm(prev => ({ ...prev, roomCount: parseInt(e.target.value) || 1 }))}
                min="1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <select
                className="px-3 py-2 border rounded-md bg-background text-foreground"
                value={editForm.difficulty || 'medium'}
                onChange={(e) => setEditForm(prev => ({ ...prev, difficulty: e.target.value }))}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              
              <Input
                type="number"
                placeholder="Hourly Rate"
                value={editForm.hourlyRate || 60}
                onChange={(e) => setEditForm(prev => ({ ...prev, hourlyRate: parseInt(e.target.value) || 60 }))}
                min="1"
              />
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setEditingProject(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editingProject && editForm.clientName && editForm.address) {
                    updateProjectMutation.mutate({ id: editingProject.id, updates: editForm });
                  }
                }}
                className="flex-1"
                disabled={!editForm.clientName || !editForm.address}
              >
                Update Client
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}