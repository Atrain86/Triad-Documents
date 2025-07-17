import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, User, MapPin, Edit3, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';

// Paint Brain Color Palette
const paintBrainColors = {
  purple: '#8B5FBF',
  orange: '#D4A574',  
  green: '#6A9955',
  red: '#F44747',
  blue: '#569CD6',
  gray: '#6B7280'
};

const statusConfig = {
  'in-progress': { label: 'In Progress', color: paintBrainColors.green, priority: 1 },
  'scheduled': { label: 'Scheduled', color: paintBrainColors.blue, priority: 2 },
  'estimate-sent': { label: 'Estimate Sent', color: paintBrainColors.purple, priority: 3 },
  'awaiting-confirmation': { label: 'Awaiting Confirmation', color: paintBrainColors.orange, priority: 4 },
  'site-visit-needed': { label: 'Site Visit Needed', color: paintBrainColors.purple, priority: 5 },
  'initial-contact': { label: 'Initial Contact', color: paintBrainColors.blue, priority: 6 },
  'follow-up-needed': { label: 'Follow-up Needed', color: paintBrainColors.orange, priority: 7 },
  'on-hold': { label: 'On Hold', color: paintBrainColors.gray, priority: 8 },
  'pending': { label: 'Pending', color: paintBrainColors.orange, priority: 9 },
  'completed': { label: 'Completed', color: paintBrainColors.green, priority: 10 },
  'cancelled': { label: 'Cancelled', color: paintBrainColors.red, priority: 11 },
  'archived': { label: 'Archived', color: paintBrainColors.gray, priority: 12 }
};

export default function StreamlinedHomepage({ onSelectProject }: { onSelectProject: (projectId: number) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['/api/projects'],
    select: (data: any[]) => data || []
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to delete project: ${error}`);
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.refetchQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      console.error('Delete failed:', error);
      alert('Failed to delete project. Please try again.');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: number; status: string }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create project: ${error}`);
      }
      return response.json();
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setShowNewClientDialog(false);
      onSelectProject(newProject.id);
    },
    onError: (error) => {
      console.error('Create failed:', error);
      alert('Failed to create project. Please try again.');
    }
  });

  const sortProjectsByPriority = (projectList: any[]) => {
    return [...projectList].sort((a, b) => {
      const priorityA = statusConfig[a.status as keyof typeof statusConfig]?.priority || 999;
      const priorityB = statusConfig[b.status as keyof typeof statusConfig]?.priority || 999;
      return priorityA - priorityB;
    });
  };

  const filteredProjects = projects.filter((project: any) => {
    const matchesSearch = searchTerm === '' || 
      project.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectType?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesArchive = showArchived ? 
      project.status === 'archived' : 
      project.status !== 'archived';
    
    return matchesSearch && matchesArchive;
  });

  const displayProjects = sortProjectsByPriority(filteredProjects);

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
          style={{ background: "linear-gradient(to right, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3, #54a0ff)" }}
        />

        <div className="flex justify-center gap-4 mb-6">
          <Button
            onClick={() => setShowNewClientDialog(true)}
            style={{ backgroundColor: paintBrainColors.red, color: 'white' }}
            className="px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            New Client
          </Button>
          
          <Button
            onClick={() => openWorkCalendar()}
            style={{ backgroundColor: paintBrainColors.green, color: 'white' }}
            className="flex items-center px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            Schedule
          </Button>
        </div>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 -translate-y-3" style={{ color: paintBrainColors.orange }} size={20} />
            <Input
              placeholder="Search clients"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-3 border-2"
              style={{ borderColor: paintBrainColors.orange }}
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-sm font-medium" style={{ color: paintBrainColors.purple }}>
              Active
            </span>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
              style={{ 
                backgroundColor: showArchived ? paintBrainColors.green : paintBrainColors.purple
              }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showArchived ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium" style={{ color: paintBrainColors.green }}>
              Archive
            </span>
          </div>
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

        <div className="space-y-4">
          {displayProjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎨</div>
              <h2 className="text-xl font-semibold mb-2">
                {searchTerm ? 'No matching projects found' : 
                 showArchived ? 'No archived projects' : 'No active projects yet'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {searchTerm ? `Try adjusting your search for "${searchTerm}"` :
                 showArchived ? 'Archived projects will appear here when you archive them' :
                 'Create your first client project to get started'}
              </p>
            </div>
          ) : (
            displayProjects.map((project: any) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onSelectProject={onSelectProject}
                updateStatusMutation={updateStatusMutation}
                deleteProjectMutation={deleteProjectMutation}
                showDragHandle={false}
              />
            ))
          )}
        </div>

        {/* New Client Dialog */}
        <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Client</DialogTitle>
            </DialogHeader>
            <NewClientForm 
              onSubmit={(data) => createProjectMutation.mutate(data)}
              onCancel={() => setShowNewClientDialog(false)}
              isLoading={createProjectMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function NewClientForm({ onSubmit, onCancel, isLoading }: { onSubmit: (data: any) => void; onCancel: () => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    clientName: '',
    address: '',
    projectType: 'interior',
    roomCount: 1,
    difficulty: 3,
    hourlyRate: 60
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName.trim()) {
      alert('Please enter a client name');
      return;
    }
    
    onSubmit({
      ...formData,
      clientName: formData.clientName.trim(),
      difficulty: formData.difficulty.toString(), // Convert to string for schema
      status: 'initial-contact'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="clientName">Client Name (Required)</Label>
        <Input
          id="clientName"
          value={formData.clientName}
          onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
          placeholder="Enter client name"
          autoFocus
        />
      </div>
      
      <div>
        <Label htmlFor="address">Address (Optional)</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          placeholder="Enter project address"
        />
      </div>

      <div>
        <Label htmlFor="projectType">Project Type</Label>
        <select
          id="projectType"
          value={formData.projectType}
          onChange={(e) => setFormData(prev => ({ ...prev, projectType: e.target.value }))}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
        >
          <option value="interior">Interior</option>
          <option value="exterior">Exterior</option>
          <option value="both">Interior & Exterior</option>
        </select>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="roomCount">Room Count</Label>
          <Input
            id="roomCount"
            type="number"
            min="1"
            value={formData.roomCount}
            onChange={(e) => setFormData(prev => ({ ...prev, roomCount: parseInt(e.target.value) || 1 }))}
          />
        </div>
        
        <div className="flex-1">
          <Label htmlFor="difficulty">Difficulty (1-5)</Label>
          <Input
            id="difficulty"
            type="number"
            min="1"
            max="5"
            value={formData.difficulty}
            onChange={(e) => setFormData(prev => ({ ...prev, difficulty: parseInt(e.target.value) || 3 }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
        <Input
          id="hourlyRate"
          type="number"
          min="0"
          step="5"
          value={formData.hourlyRate}
          onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: parseInt(e.target.value) || 60 }))}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1"
          style={{ backgroundColor: '#F44747', color: 'white' }}
        >
          {isLoading ? 'Creating...' : 'Create Client'}
        </Button>
      </div>
    </form>
  );
}

// Status icon component
function StatusIcon({ status }: { status: string }) {
  const [iconError, setIconError] = useState(false);
  
  // Fallback to emoji if SVG fails to load
  const fallbackEmojis: { [key: string]: string } = {
    'in-progress': '🟢',
    'scheduled': '🔵',
    'estimate-sent': '📝',
    'awaiting-confirmation': '⏳',
    'site-visit-needed': '📍',
    'initial-contact': '📞',
    'follow-up-needed': '🔄',
    'on-hold': '⏸️',
    'pending': '🟡',
    'completed': '✅',
    'cancelled': '❌',
    'archived': '📦'
  };

  if (iconError) {
    return <span className="mr-1 text-sm">{fallbackEmojis[status] || '🔴'}</span>;
  }

  return (
    <img 
      src={`/icons/icons/${status}.png`} 
      alt={`${status} status`}
      className="w-6 h-6 inline-block mr-2"
      style={{ filter: 'none', minWidth: '24px', minHeight: '24px' }}
      onError={() => setIconError(true)}
      onLoad={() => console.log(`Paint Brain icon loaded: ${status}`)}
    />
  );
}

function ProjectCard({ project, onSelectProject, updateStatusMutation, deleteProjectMutation, showDragHandle }: any) {
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);

  const handleCardClick = (e: React.MouseEvent) => {
    // Only trigger navigation if the click is on the main card area
    // and not on any interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'SELECT' || target.tagName === 'OPTION' || target.tagName === 'BUTTON' || target.closest('select') || target.closest('button')) {
      return;
    }
    onSelectProject(project.id);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setTouchStartTime(Date.now());
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'SELECT' || target.tagName === 'OPTION' || target.tagName === 'BUTTON' || target.closest('select') || target.closest('button')) {
      return;
    }

    if (!touchStartPos || !touchStartTime) return;

    const touch = e.changedTouches[0];
    const touchEndPos = { x: touch.clientX, y: touch.clientY };
    const touchDuration = Date.now() - touchStartTime;
    
    // Calculate distance moved
    const distanceMoved = Math.sqrt(
      Math.pow(touchEndPos.x - touchStartPos.x, 2) + 
      Math.pow(touchEndPos.y - touchStartPos.y, 2)
    );

    // Only trigger if:
    // 1. Touch duration is less than 300ms (quick tap)
    // 2. Distance moved is less than 10px (not a scroll/swipe)
    if (touchDuration < 300 && distanceMoved < 10) {
      onSelectProject(project.id);
    }

    setTouchStartPos(null);
    setTouchStartTime(null);
  };

  return (
    <div 
      className="bg-card rounded-lg p-5 shadow-sm border border-border hover:border-primary/50 transition-colors cursor-pointer group relative"
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-start gap-3">
        {showDragHandle && (
          <div className="drag-handle cursor-move text-muted-foreground hover:text-foreground transition-colors mt-2">
            <GripVertical size={16} />
          </div>
        )}
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
          <div className="flex items-center">
            <StatusIcon status={project.status} />
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
              onTouchEnd={(e) => e.stopPropagation()}
              className="text-xs font-medium border-none bg-transparent cursor-pointer focus:outline-none relative z-10"
              style={{ color: statusConfig[project.status as keyof typeof statusConfig]?.color || paintBrainColors.gray }}
            >
              <option value="in-progress">In Progress</option>
              <option value="scheduled">Scheduled</option>
              <option value="estimate-sent">Estimate Sent</option>
              <option value="awaiting-confirmation">Awaiting Confirmation</option>
              <option value="site-visit-needed">Site Visit Needed</option>
              <option value="initial-contact">Initial Contact</option>
              <option value="follow-up-needed">Follow-up Needed</option>
              <option value="on-hold">On Hold</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="absolute top-5 right-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Handle edit
          }}
          onTouchEnd={(e) => e.stopPropagation()}
          className="p-2 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded"
          style={{ color: paintBrainColors.blue }}
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
          onTouchEnd={(e) => e.stopPropagation()}
          className="p-2 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded"
          style={{ color: paintBrainColors.orange }}
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
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="p-2 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded"
          style={{ color: paintBrainColors.red }}
          title="Delete client permanently"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}