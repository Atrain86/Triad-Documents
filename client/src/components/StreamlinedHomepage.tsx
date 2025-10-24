import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Edit3, Archive, RotateCcw, Trash2, Mail, Settings, GripVertical } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import DarkModeCalendar from './DarkModeCalendar';
import TaxSetupModal from './settings/TaxSetupModal';

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
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logout } = useAuth();

  const [logoScale, setLogoScale] = useState(() => {
    const saved = localStorage.getItem('logoScale');
    let parsed = saved ? parseInt(saved) : 100;
    if (parsed > 500) {
      parsed = 100;
      localStorage.clear();
      localStorage.setItem('logoScale', '100');
    }
    return parsed;
  });

  const [logoVerticalPosition, setLogoVerticalPosition] = useState(() => {
    const saved = localStorage.getItem('logoVerticalPosition');
    return saved ? parseInt(saved) : 0;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('logoScale');
      const parsed = saved ? parseInt(saved) : 100;
      setLogoScale(parsed);
      const savedPosition = localStorage.getItem('logoVerticalPosition');
      setLogoVerticalPosition(savedPosition ? parseInt(savedPosition) : 0);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const taxSetupCompleted = localStorage.getItem('taxSetupCompleted');
    const hasShownSetup = sessionStorage.getItem('hasShownTaxSetup');
    if (!taxSetupCompleted && !hasShownSetup) {
      setShowTaxSetup(true);
      sessionStorage.setItem('hasShownTaxSetup', 'true');
    }
  }, []);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['/api/projects'],
    select: (data: any[]) => data || []
  });

  const { data: homepageLogo } = useQuery({
    queryKey: [`/api/users/1/logos/homepage`],
    select: (data: any) => data?.logo || null
  });

  const { data: fallbackLogo } = useQuery({
    queryKey: [`/api/users/1/logo`],
    select: (data: any) => data?.logo || null,
    enabled: !homepageLogo
  });

  const currentLogo = homepageLogo || fallbackLogo;

  const [logoVisibility, setLogoVisibility] = useState(() => {
    const saved = localStorage.getItem('logoVisibility');
    return saved ? JSON.parse(saved) : { homepage: true };
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete project');
      return { success: true };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/projects'] })
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: number; status: string }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/projects'] })
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: any }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setShowEditDialog(false);
      toast({ title: 'Client Updated', description: 'Client info updated successfully!' });
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ recipientEmail, subject, message }: { recipientEmail: string; subject: string; message: string }) => {
      const response = await fetch('/api/send-basic-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipientEmail, subject, text: message })
      });
      if (!response.ok) throw new Error('Failed to send email');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Email Sent', description: 'Your email has been sent!' });
      setShowEmailDialog(false);
      setEmailForm({ subject: '', message: '' });
    }
  });

  const handleEmailClient = (project: any) => {
    if (!project.clientEmail) {
      toast({ title: 'No Email', description: 'This client has no email address.' });
      return;
    }
    setSelectedProject(project);
    setEmailForm({ subject: '', message: '' });
    setShowEmailDialog(true);
  };

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });
      if (!response.ok) throw new Error('Failed to create project');
      return response.json();
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setShowNewClientDialog(false);
      onSelectProject(newProject.id);
    }
  });

  const filteredProjects = projects.filter((project: any) => {
    const match = searchTerm === '' || project.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    if (searchTerm !== '') return match;
    const archived = showArchived ? project.status === 'archived' : project.status !== 'archived';
    return match && archived;
  });

  const openWorkCalendar = () => window.open('https://calendar.google.com/calendar/u/0/r/month', '_blank');

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-6">
        <div className="mb-4">
          {onAccessSettings && (
            <Button onClick={onAccessSettings} variant="ghost" size="sm" className="text-gray-400 hover:text-gray-300" title="Settings">
              <Settings size={18} />
            </Button>
          )}
        </div>

        {logoVisibility.homepage && (
          <div className="flex justify-center mb-8 -mt-2">
            <img src={currentLogo?.url || '/aframe-logo.png'} alt="Business Logo" className="h-14 w-auto object-contain" style={{ transform: `scale(${logoScale / 100}) translateY(${logoVerticalPosition}px)` }} />
          </div>
        )}

        <div className="flex justify-center gap-4 mb-6">
          <Button onClick={() => setShowNewClientDialog(true)} style={{ backgroundColor: paintBrainColors.red, color: 'white' }}>New Client</Button>
          <Button onClick={openWorkCalendar} style={{ backgroundColor: '#7B4FF2', color: 'white' }}>Schedule</Button>
        </div>

        <div className="flex justify-center mb-6">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: paintBrainColors.orange }} size={20} />
            <Input placeholder="Search clients" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-10 py-3 border-2 w-full" style={{ borderColor: paintBrainColors.orange }} />
          </div>
        </div>

        <div className="space-y-4">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 text-lg">No projects found</div>
          ) : (
            filteredProjects.map((project: any) => (
              <div key={project.id} className="p-4 border border-gray-600 rounded-lg">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-semibold text-lg" style={{ color: paintBrainColors.purple }}>{project.clientName}</h3>
                    <p style={{ color: paintBrainColors.green }}>{project.address || 'No address'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEmailClient(project)} size="sm" style={{ backgroundColor: paintBrainColors.purple, color: 'white' }}>Email</Button>
                    <Button onClick={() => deleteProjectMutation.mutate(project.id)} size="sm" style={{ backgroundColor: paintBrainColors.red, color: 'white' }}>Delete</Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Client</DialogTitle>
            </DialogHeader>
            <NewClientForm onSubmit={(data) => createProjectMutation.mutate(data)} onCancel={() => setShowNewClientDialog(false)} isLoading={createProjectMutation.isPending} />
          </DialogContent>
        </Dialog>

        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Email {selectedProject?.clientName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} placeholder="Email subject" />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" value={emailForm.message} onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })} rows={8} placeholder="Enter your message..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
                <Button onClick={() => sendEmailMutation.mutate({ recipientEmail: selectedProject.clientEmail, subject: emailForm.subject, message: emailForm.message })} disabled={sendEmailMutation.isPending} style={{ backgroundColor: paintBrainColors.purple, color: 'white' }}>
                  {sendEmailMutation.isPending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <DarkModeCalendar isOpen={showCalendar} onClose={() => setShowCalendar(false)} />
        <TaxSetupModal isOpen={showTaxSetup} onClose={() => setShowTaxSetup(false)} />
      </div>
    </div>
  );
}

function NewClientForm({ onSubmit, onCancel, isLoading }: { onSubmit: (data: any) => void; onCancel: () => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({ clientName: '', address: '', projectType: 'interior', roomCount: 0, hourlyRate: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName.trim()) return alert('Please enter a client name');
    onSubmit({ ...formData, clientName: formData.clientName.trim(), hourlyRate: parseInt(formData.hourlyRate) || 0, status: 'initial-contact' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="clientName">Client Name</Label>
        <Input id="clientName" value={formData.clientName} onChange={(e) => setFormData({ ...formData, clientName: e.target.value })} placeholder="Enter client name" />
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Enter address" />
      </div>
      <div>
        <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
        <Input id="hourlyRate" value={formData.hourlyRate} onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })} placeholder="Enter rate" />
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1">Cancel</Button>
        <Button type="submit" disabled={isLoading} className="flex-1" style={{ backgroundColor: '#F44747', color: 'white' }}>{isLoading ? 'Creating...' : 'Create Client'}</Button>
      </div>
    </form>
  );
}
