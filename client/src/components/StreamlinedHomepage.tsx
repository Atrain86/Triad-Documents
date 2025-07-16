import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, User, MapPin, Edit3, Archive, RotateCcw, Trash2, GripVertical } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ReactSortable } from 'react-sortablejs';

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
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualProjects, setManualProjects] = useState<any[]>([]);
  
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['/api/projects'],
    select: (data: any[]) => data || []
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
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

  const baseFilteredProjects = sortProjectsByPriority(filteredProjects);
  const displayProjects = isManualMode ? manualProjects : baseFilteredProjects;

  useEffect(() => {
    if (isManualMode && manualProjects.length === 0) {
      setManualProjects(sortProjectsByPriority(baseFilteredProjects));
    }
  }, [isManualMode, baseFilteredProjects]);

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
            src="/paint-brain-logo-pure-black.png" 
            alt="Paint Brain" 
            className="h-32 w-auto object-contain"
            onError={(e) => {
              console.log('Paint Brain logo failed, trying A-frame fallback');
              e.currentTarget.src = "/aframe-logo.png";
            }}
          />
        </div>

        <div 
          className="h-1 w-full mb-8"
          style={{ background: "linear-gradient(to right, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3, #54a0ff)" }}
        />

        <div className="flex justify-center gap-4 mb-6">
          <Button
            onClick={() => {/* Handle new client */}}
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: paintBrainColors.orange }} size={18} />
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
            className="px-3 py-3 text-sm"
            style={isManualMode ? 
              { backgroundColor: paintBrainColors.orange, color: 'white' } : 
              { backgroundColor: 'transparent', color: paintBrainColors.orange, borderColor: paintBrainColors.orange }
            }
          >
            {isManualMode ? 'Smart' : 'Manual'}
          </Button>
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
            className="px-4 py-3"
            style={showArchived ? 
              { backgroundColor: paintBrainColors.orange, color: 'white' } : 
              { backgroundColor: 'transparent', color: paintBrainColors.orange, borderColor: paintBrainColors.orange }
            }
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

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
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
            isManualMode ? (
              <ReactSortable 
                list={displayProjects} 
                setList={(newList) => setManualProjects(newList)}
                className="space-y-4"
                handle=".drag-handle"
              >
                {displayProjects.map((project: any) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    onSelectProject={onSelectProject}
                    updateStatusMutation={updateStatusMutation}
                    deleteProjectMutation={deleteProjectMutation}
                    showDragHandle={true}
                  />
                ))}
              </ReactSortable>
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
            )
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onSelectProject, updateStatusMutation, deleteProjectMutation, showDragHandle }: any) {
  return (
    <div 
      className="bg-card rounded-lg p-5 shadow-sm border border-border hover:border-primary/50 transition-colors cursor-pointer group relative"
      onClick={() => onSelectProject(project.id)}
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
            className="text-xs font-medium border-none bg-transparent cursor-pointer focus:outline-none"
            style={{ color: statusConfig[project.status as keyof typeof statusConfig]?.color || paintBrainColors.gray }}
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
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="absolute top-5 right-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Handle edit
          }}
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