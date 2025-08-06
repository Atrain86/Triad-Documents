import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, User, MapPin, Edit3, Archive, RotateCcw, Trash2, Mail, LogOut, Settings, GripVertical } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import ClientPhone from './ClientPhone';
import DarkModeCalendar from './DarkModeCalendar';
import TaxSetupModal from './settings/TaxSetupModal';


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

export default function StreamlinedHomepage({ 
  onSelectProject, 
  onAccessSettings 
}: { 
  onSelectProject: (projectId: number) => void;
  onAccessSettings?: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTaxSetup, setShowTaxSetup] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [emailForm, setEmailForm] = useState({
    subject: '',
    message: ''
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logout } = useAuth();

  // Logo scaling and positioning state
  const [logoScale, setLogoScale] = useState(() => {
    const saved = localStorage.getItem('logoScale');
    let parsed = saved ? parseInt(saved) : 100;
    // Clear SPECIFIC problematic cached values - 425%, 430%, 415%
    if (parsed === 240 || parsed === 335 || parsed === 340 || parsed === 350 || parsed === 365 || parsed === 415 || parsed === 425 || parsed === 430 || parsed > 500) {
      console.log('CLEARING PROBLEMATIC CACHE:', parsed, 'resetting to 100%');
      parsed = 100;
      localStorage.clear(); // Nuclear clear
      localStorage.setItem('logoScale', '100');
    }
    console.log('Homepage logoScale initialized to:', parsed);
    return parsed;
  });
  
  const [logoVerticalPosition, setLogoVerticalPosition] = useState(() => {
    const saved = localStorage.getItem('logoVerticalPosition');
    return saved ? parseInt(saved) : 0;
  });

  // Listen for logo changes with forced refresh
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('logoScale');
      const parsed = saved ? parseInt(saved) : 100;
      setLogoScale(parsed);
      
      const savedPosition = localStorage.getItem('logoVerticalPosition');
      setLogoVerticalPosition(savedPosition ? parseInt(savedPosition) : 0);
    };

    const handleLogoScaleChange = (event: CustomEvent) => {
      setLogoScale(event.detail);
    };
    
    const handleLogoVerticalPositionChange = (event: CustomEvent) => {
      setLogoVerticalPosition(event.detail);
    };

    // Force refresh on mount
    handleStorageChange();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('logoScaleChanged', handleLogoScaleChange as EventListener);
    window.addEventListener('logoVerticalPositionChanged', handleLogoVerticalPositionChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('logoScaleChanged', handleLogoScaleChange as EventListener);
      window.removeEventListener('logoVerticalPositionChanged', handleLogoVerticalPositionChange as EventListener);
    };
  }, []);

  // Check for first login and show tax setup modal only once
  useEffect(() => {
    const taxSetupCompleted = localStorage.getItem('taxSetupCompleted');
    const hasShownSetup = sessionStorage.getItem('hasShownTaxSetup');
    
    // TEMPORARY: Force show modal to test styling (remove this line after testing)
    setShowTaxSetup(true);
    
    // Only show if never completed AND not shown in this session
    // if (!taxSetupCompleted && !hasShownSetup) {
    //   setShowTaxSetup(true);
    //   sessionStorage.setItem('hasShownTaxSetup', 'true');
    // }
  }, []);

  // Listen for logo visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const saved = localStorage.getItem('logoVisibility');
      if (saved) {
        setLogoVisibility(JSON.parse(saved));
      }
    };

    window.addEventListener('storage', handleVisibilityChange);
    return () => window.removeEventListener('storage', handleVisibilityChange);
  }, []);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['/api/projects'],
    select: (data: any[]) => data || []
  });

  // Get homepage logo (Paint Brain logo)
  const { data: homepageLogo } = useQuery({
    queryKey: [`/api/users/1/logos/homepage`],
    select: (data: any) => data?.logo || null
  });

  // Fallback to regular logo if no homepage-specific logo is set
  const { data: fallbackLogo } = useQuery({
    queryKey: [`/api/users/1/logo`],
    select: (data: any) => data?.logo || null,
    enabled: !homepageLogo
  });

  const currentLogo = homepageLogo || fallbackLogo;

  // Logo visibility settings
  const [logoVisibility, setLogoVisibility] = useState(() => {
    const saved = localStorage.getItem('logoVisibility');
    return saved ? JSON.parse(saved) : {
      homepage: true,
      estimates: true,
      emails: true
    };
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

  const updateProjectMutation = useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: any }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to update project: ${error}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setShowEditDialog(false);
      setEditingProject(null);
      toast({
        title: "Client Updated",
        description: "Client information has been updated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed", 
        description: error.message || "Failed to update client. Please try again.",
        variant: "destructive",
      });
    },
  });

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

  const handleEmailClient = (project: any) => {
    if (!project.clientEmail) {
      toast({
        title: "No Email Address",
        description: "This client doesn't have an email address. Please add one in the client details.",
        variant: "destructive",
      });
      return;
    }
    setSelectedProject(project);
    setEmailForm({
      subject: '',
      message: ''
    });
    setShowEmailDialog(true);
  };

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
    
    // If there's a search term, show all matching projects regardless of archive status
    if (searchTerm !== '') {
      return matchesSearch;
    }
    
    // If no search term, filter by archive status as normal
    const matchesArchive = showArchived ? 
      project.status === 'archived' : 
      project.status !== 'archived';
    
    return matchesSearch && matchesArchive;
  });

  const displayProjects = sortProjectsByPriority(filteredProjects);

  const openWorkCalendar = () => {
    // Open Google Calendar in month view - you can manually uncheck ALAN and MAIN 1 calendars in sidebar
    window.open('https://calendar.google.com/calendar/u/0/r/month', '_blank');
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
        {/* Settings gear icon at top-left */}
        <div className="mb-4">
          {onAccessSettings && (
            <Button
              onClick={onAccessSettings}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-300"
              title="Settings"
            >
              <Settings size={18} />
            </Button>
          )}
        </div>
        
        {/* Centered logo */}
        {logoVisibility.homepage && (
          <div className="flex justify-center mb-8 -mt-2">
            <img 
              src={currentLogo?.url || "/aframe-logo.png"} 
              alt="Business Logo" 
              className="h-14 w-auto object-contain"
              style={{ 
                transform: `scale(${logoScale / 100}) translateY(${logoVerticalPosition}px)` 
              }}
            />
          </div>
        )}



        {/* Additional spacing below logo */}
        <div className="mb-16"></div>

        {/* Centered New Client and Schedule buttons */}
        <div className="flex justify-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowNewClientDialog(true)}
              style={{ backgroundColor: paintBrainColors.red, color: 'white' }}
              className="px-4 py-2 text-sm font-semibold hover:opacity-90"
            >
              New Client
            </Button>

          </div>
          
          <Button
            onClick={() => openWorkCalendar()}
            style={{ backgroundColor: '#7B4FF2', color: 'white' }}
            className="flex items-center px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            Schedule
          </Button>
        </div>

        {/* Active/Archive Toggle */}
        {projects.length > 0 && (
          <div className="flex justify-center items-center mb-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium" style={{ color: paintBrainColors.green }}>
                {projects.filter((p: any) => p.status !== 'archived').length} Active
              </span>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                style={{ 
                  backgroundColor: showArchived ? '#7B4FF2' : '#7B4FF2'
                }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showArchived ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm font-medium" style={{ color: '#7B4FF2' }}>
                {projects.filter((p: any) => p.status === 'archived').length} Archive
              </span>

            </div>
          </div>
        )}

        {/* Search container */}
        <div className="flex justify-center mb-6">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: paintBrainColors.orange }} size={20} />
            <Input
              placeholder="Search clients"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 py-3 border-2 w-full"
              style={{ borderColor: paintBrainColors.orange }}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">

            </div>
          </div>
        </div>

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
                handleEmailClient={handleEmailClient}
                showDragHandle={false}
                setEditingProject={setEditingProject}
                setShowEditDialog={setShowEditDialog}
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

        {/* Email Client Dialog */}
        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Email {selectedProject?.clientName}</DialogTitle>
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
                    if (selectedProject?.clientEmail && emailForm.subject && emailForm.message) {
                      sendEmailMutation.mutate({
                        recipientEmail: selectedProject.clientEmail,
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

        {/* Edit Client Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Client Information</DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto pr-2">
              {editingProject && (
                <EditClientForm 
                  project={editingProject}
                  onSubmit={(data) => updateProjectMutation.mutate({ projectId: editingProject.id, data })}
                  onCancel={() => {
                    setShowEditDialog(false);
                    setEditingProject(null);
                  }}
                  isLoading={updateProjectMutation.isPending}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Dark Mode Calendar */}
        <DarkModeCalendar
          isOpen={showCalendar}
          onClose={() => setShowCalendar(false)}
        />

        {/* Tax Setup Modal */}
        <TaxSetupModal
          isOpen={showTaxSetup}
          onClose={() => setShowTaxSetup(false)}
        />
      </div>


    </div>
  );
}

function NewClientForm({ onSubmit, onCancel, isLoading }: { onSubmit: (data: any) => void; onCancel: () => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    clientName: '',
    address: '',
    projectType: 'interior',
    roomCount: 0,
    hourlyRate: ''
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
      hourlyRate: parseInt(formData.hourlyRate) || 0,
      status: 'initial-contact',
      difficulty: 'medium'  // Always include difficulty with default value
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

      <div>
        <Label htmlFor="roomCount">Room Count</Label>
        <Input
          id="roomCount"
          type="number"
          min="0"
          value={formData.roomCount || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, roomCount: parseInt(e.target.value) || 0 }))}
          placeholder="Enter number of rooms"
        />
      </div>

      <div>
        <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
        <Input
          id="hourlyRate"
          type="number"
          min="0"
          step="1"
          value={formData.hourlyRate}
          onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
          placeholder="Enter hourly rate"
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

// Status icon component - larger colored circles
function StatusIcon({ status }: { status: string }) {
  const statusColors: { [key: string]: string } = {
    'in-progress': '#6A9955',        // Green
    'scheduled': '#569CD6',          // Blue  
    'estimate-sent': '#D4A574',      // Orange
    'awaiting-confirmation': '#DCDCAA', // Yellow
    'site-visit-needed': '#8B5FBF',  // Purple
    'initial-contact': '#4ECDC4',    // Teal
    'follow-up-needed': '#FFB347',   // Light orange
    'on-hold': '#9B9B9B',           // Gray
    'pending': '#F1C40F',           // Bright yellow
    'completed': '#2ECC71',         // Bright green
    'cancelled': '#E74C3C',         // Red
    'archived': '#7F8C8D'           // Dark gray
  };

  const color = statusColors[status] || '#6B7280';

  return (
    <div 
      className="w-3 h-3 rounded-full mr-2 flex-shrink-0 pointer-events-none"
      style={{ backgroundColor: color }}
      title={status}
    />
  );
}

function StatusButton({ project, updateStatusMutation }: { project: any; updateStatusMutation: any }) {
  const [showModal, setShowModal] = useState(false);
  
  const statusOptions = [
    { value: 'in-progress', label: 'In Progress' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'estimate-sent', label: 'Estimate Sent' },
    { value: 'awaiting-confirmation', label: 'Awaiting Confirmation' },
    { value: 'site-visit-needed', label: 'Site Visit Needed' },
    { value: 'initial-contact', label: 'Initial Contact' },
    { value: 'follow-up-needed', label: 'Follow-up Needed' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'archived', label: 'Archived' }
  ];

  const handleStatusChange = async (newStatus: string) => {
    console.log('Changing status to:', newStatus, 'for project:', project.id);
    
    setShowModal(false);
    
    // Use mutateAsync to wait for completion
    try {
      await updateStatusMutation.mutateAsync({ 
        projectId: project.id, 
        status: newStatus 
      });
      console.log('Status updated successfully');
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <>
      {/* Status Button - completely isolated from card events */}
      <div className="relative z-30">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Opening status modal');
            setShowModal(true);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="flex items-center pointer-events-auto bg-card/50 rounded-md px-2 py-1 hover:bg-card/80 transition-colors cursor-pointer"
          style={{ 
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
        >
          <StatusIcon status={project.status} />
          <span 
            className="text-xs font-medium"
            style={{ 
              color: statusConfig[project.status as keyof typeof statusConfig]?.color || paintBrainColors.gray 
            }}
          >
            {statusConfig[project.status as keyof typeof statusConfig]?.label || project.status}
          </span>
        </button>
      </div>

      {/* Status Selection Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-black border border-gray-600 rounded-lg shadow-2xl max-w-sm w-full max-h-80 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-gray-600 bg-gray-900 flex justify-between items-center">
              <h3 className="font-medium text-sm text-white">Change Status</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-2 bg-black space-y-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleStatusChange(option.value)}
                  className={`w-full text-left px-3 py-3 text-sm transition-colors rounded-md text-white cursor-pointer ${
                    option.value === project.status 
                      ? 'bg-gray-700 border border-gray-500' 
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center">
                    <StatusIcon status={option.value} />
                    <span>{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProjectCard({ project, onSelectProject, updateStatusMutation, deleteProjectMutation, handleEmailClient, showDragHandle, setEditingProject, setShowEditDialog }: any) {
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
    // More comprehensive check for interactive elements
    if (target.tagName === 'SELECT' || 
        target.tagName === 'OPTION' || 
        target.tagName === 'BUTTON' || 
        target.closest('select') || 
        target.closest('button') ||
        target.classList.contains('pointer-events-auto') ||
        target.closest('[class*="z-20"]') ||
        target.closest('[class*="z-30"]') ||
        target.closest('[class*="z-50"]') ||
        target.closest('.fixed')) {
      console.log('Touch blocked on interactive element:', target.tagName, target.className);
      e.stopPropagation();
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
      {/* Action Buttons - moved to top right */}
      <div className="absolute top-3 right-3 flex gap-1 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditingProject(project);
            setShowEditDialog(true);
          }}
          onTouchEnd={(e) => e.stopPropagation()}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          style={{ color: paintBrainColors.red }}
          title="Edit client"
        >
          <Edit3 size={16} />
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEmailClient(project);
          }}
          onTouchEnd={(e) => e.stopPropagation()}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          style={{ color: paintBrainColors.purple }}
          title="Email client"
        >
          <Mail size={16} />
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
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          style={{ color: paintBrainColors.orange }}
          title={project.status === 'archived' ? "Restore client" : "Archive client"}
        >
          {project.status === 'archived' ? <RotateCcw size={16} /> : <Archive size={16} />}
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete ${project.clientName || 'this client'}?`)) {
              deleteProjectMutation.mutate(project.id);
            }
          }}
          onTouchEnd={(e) => e.stopPropagation()}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-red-500"
          title="Delete client"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex items-start gap-3 pr-20">
        {showDragHandle && (
          <div className="drag-handle cursor-move text-muted-foreground hover:text-foreground transition-colors mt-2">
            <GripVertical size={16} />
          </div>
        )}
        <div className="flex-1">
          {/* Client Name - First Line */}
          <h3 className="font-semibold text-lg mb-1" style={{ color: paintBrainColors.purple }}>
            {project.clientName || 'Unnamed Client'}
          </h3>
          
          {/* Address - Second Line */}
          <p className="text-sm mb-1" style={{ color: paintBrainColors.green }}>
            {project.address || 'No address'}
          </p>
          
          {/* City, Province - Third Line */}
          {(project.clientCity || project.clientPostal) && (
            <p className="text-sm mb-1" style={{ color: paintBrainColors.green }}>
              {[project.clientCity, 'BC'].filter(Boolean).join(', ')}
            </p>
          )}
          
          {/* ZIP Code - Fourth Line */}
          {project.clientPostal && (
            <p className="text-sm mb-2" style={{ color: paintBrainColors.green }}>
              {project.clientPostal}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center text-sm justify-start" style={{ color: paintBrainColors.orange }}>
          <span className="capitalize">{project.projectType}</span>
          {project.projectType === 'interior' && (
            <>
              <span className="px-1">•</span>
              <span>{project.roomCount} room{project.roomCount !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <StatusButton 
            project={project} 
            updateStatusMutation={updateStatusMutation}
          />
        </div>
      </div>
      

    </div>
  );
}

function EditClientForm({ project, onSubmit, onCancel, isLoading }: { project: any; onSubmit: (data: any) => void; onCancel: () => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    clientName: project.clientName || '',
    address: project.address || '',
    clientCity: project.clientCity || '',
    clientPostal: project.clientPostal || '',
    clientEmail: project.clientEmail || '',
    clientPhone: project.clientPhone || '',
    projectType: project.projectType || 'interior',
    roomCount: project.roomCount ?? 0,
    hourlyRate: project.hourlyRate ?? 0
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
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="editClientName">Client Name (Required)</Label>
        <Input
          id="editClientName"
          value={formData.clientName}
          onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
          placeholder="Enter client name"
          autoFocus
        />
      </div>
      
      <div>
        <Label htmlFor="editAddress">Address</Label>
        <Input
          id="editAddress"
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          placeholder="Enter project address"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="editClientCity">City</Label>
          <Input
            id="editClientCity"
            value={formData.clientCity}
            onChange={(e) => setFormData(prev => ({ ...prev, clientCity: e.target.value }))}
            placeholder="City"
          />
        </div>
        <div>
          <Label htmlFor="editClientPostal">Postal Code</Label>
          <Input
            id="editClientPostal"
            value={formData.clientPostal}
            onChange={(e) => setFormData(prev => ({ ...prev, clientPostal: e.target.value }))}
            placeholder="V0P 1K0"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="editClientEmail">Email</Label>
        <Input
          id="editClientEmail"
          type="email"
          value={formData.clientEmail}
          onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
          placeholder="client@email.com"
        />
      </div>

      <div>
        <Label htmlFor="editClientPhone">Phone Number</Label>
        <Input
          id="editClientPhone"
          type="tel"
          value={formData.clientPhone}
          onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
          placeholder="(250) 123-4567"
        />
      </div>

      <div>
        <Label htmlFor="editProjectType">Project Type</Label>
        <select
          id="editProjectType"
          value={formData.projectType}
          onChange={(e) => setFormData(prev => ({ ...prev, projectType: e.target.value }))}
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
        >
          <option value="interior">Interior</option>
          <option value="exterior">Exterior</option>
          <option value="both">Interior & Exterior</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="editRoomCount">Room Count</Label>
          <Input
            id="editRoomCount"
            type="number"
            min="0"
            value={formData.roomCount}
            onChange={(e) => setFormData(prev => ({ ...prev, roomCount: parseInt(e.target.value) || 0 }))}
            placeholder="Enter room count"
          />
        </div>
        <div>
          <Label htmlFor="editHourlyRate">Hourly Rate ($)</Label>
          <Input
            id="editHourlyRate"
            type="number"
            min="0"
            step="1"
            value={formData.hourlyRate}
            onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: parseInt(e.target.value) || 0 }))}
            placeholder="Enter hourly rate"
          />
        </div>
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
          style={{ backgroundColor: '#8B5FBF', color: 'white' }}
        >
          {isLoading ? 'Updating...' : 'Update Client'}
        </Button>
      </div>
    </form>
  );
}