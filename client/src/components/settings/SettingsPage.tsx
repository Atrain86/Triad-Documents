import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Settings, DollarSign, Globe, Mail, ChevronRight, Info, Menu, X, Camera, FileText, Upload, Trash2, Plus, Minus, Building2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReactSortable } from 'react-sortablejs';
import { apiRequest } from '@/lib/queryClient';

import AdminDashboard from '../admin/AdminDashboard';
import TaxConfiguration from './TaxConfiguration';
import GmailIntegration from './GmailIntegration';
import { useAuth } from '@/contexts/AuthContext';



interface RecentUsageEntry {
  id: number;
  userId: number;
  operation: string;
  tokensUsed: number;
  estimatedCost: number;
  createdAt: string;
}

const RecentActivityContent: React.FC = () => {
  const { data: recentUsage, isLoading: recentUsageLoading } = useQuery<RecentUsageEntry[]>({
    queryKey: ['/api/admin/token-usage/recent'],
  });

  const { data: totalStats, isLoading: totalStatsLoading } = useQuery<{ totalTokens: number; totalCost: number }>({
    queryKey: ['/api/admin/token-usage/total'],
  });

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const cleanOperationName = (operation: string): string => {
    return operation
      .replace('_', ' ')
      .replace(/receipt/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  return (
    <>
      {/* Total Token Usage Summary */}
      <div className="mb-6 p-4 rounded-lg border border-cyan-400/50 bg-cyan-400/5">
        <div className="flex justify-between items-center">
          {totalStatsLoading ? (
            <>
              <div className="animate-pulse">
                <div className="h-5 bg-gray-600 rounded w-32 mb-1"></div>
                <div className="h-4 bg-gray-600 rounded w-24"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-6 bg-gray-600 rounded w-20"></div>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="font-semibold text-cyan-200">Total Usage</p>
                <p className="text-sm text-cyan-400">{formatNumber(totalStats?.totalTokens || 0)} tokens</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-cyan-300">{formatCurrency(totalStats?.totalCost || 0)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Activity History */}
      <div>
        <h4 className="text-cyan-300 font-medium mb-3">Recent Activity</h4>
        {recentUsageLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-transparent p-4 rounded-lg border border-cyan-600/30">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-600 rounded mb-2 w-32"></div>
                    <div className="h-3 bg-gray-600 rounded w-24"></div>
                  </div>
                  <div className="h-4 bg-gray-600 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentUsage && recentUsage.length > 0 ? (
          <div className="space-y-3">
            {recentUsage.slice(0, 8).map((entry) => (
              <div key={entry.id} className="bg-transparent p-4 rounded-lg border border-cyan-600/30">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-cyan-200 capitalize">{cleanOperationName(entry.operation)}</p>
                    </div>
                    <p className="text-sm text-cyan-400">{formatDate(entry.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-cyan-300">{formatCurrency(entry.estimatedCost)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-transparent p-4 rounded-lg border border-cyan-600/30">
            <p className="text-cyan-400 text-center">No recent activity</p>
          </div>
        )}
      </div>
    </>
  );
};

interface SettingsPageProps {
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { logout } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showGmailPopup, setShowGmailPopup] = useState(false);

  const { data: gmailStatus } = useQuery<{ connected: boolean }>({
    queryKey: ['/api/gmail/status/1'],
  });

  // Fetch current user's logo
  const { data: logoData } = useQuery({
    queryKey: [`/api/users/1/logo`]
  });

  // Fetch logo library
  const { data: logoLibrary = [] } = useQuery({
    queryKey: ['/api/logo-library'],
    queryFn: async () => {
      const response = await fetch('/api/logo-library');
      if (!response.ok) throw new Error('Failed to fetch logo library');
      return response.json();
    }
  });

  const queryClient = useQueryClient();

  // Check if tax configuration is properly set up
  const checkTaxConfiguration = () => {
    try {
      const saved = localStorage.getItem('taxConfiguration');
      if (!saved) return false;
      
      const config = JSON.parse(saved);
      // Check if any tax rate is greater than 0
      return config.gst > 0 || config.pst > 0 || config.hst > 0 || 
             config.salesTax > 0 || config.vat > 0 || config.otherTax > 0;
    } catch {
      return false;
    }
  };

  const [isTaxConfigured, setIsTaxConfigured] = useState(checkTaxConfiguration());

  // Photo compression settings state
  const [photoCompressionLevel, setPhotoCompressionLevel] = useState(() => {
    const saved = localStorage.getItem('photoCompressionLevel');
    return saved || 'medium';
  });

  // Timezone settings state
  const [selectedTimezone, setSelectedTimezone] = useState(() => {
    const saved = localStorage.getItem('selectedTimezone');
    return saved || 'eastern';
  });

  // Define sortable sections
  const [settingsSections, setSettingsSections] = useState([
    { id: 'gmail', name: 'Gmail Integration', icon: Mail, color: 'red' },
    { id: 'logo', name: 'Business Logo', icon: Settings, color: 'blue' },
    { id: 'contextual-logos', name: 'Contextual Logos', icon: Building2, color: 'indigo' },
    { id: 'photo', name: 'Photo Quality', icon: Camera, color: 'orange' },
    { id: 'timezone', name: 'Time Zone', icon: Globe, color: 'green' },
    { id: 'invoice', name: 'Invoice Numbering', icon: FileText, color: 'purple' },
    { id: 'tax', name: 'Tax Configuration', icon: DollarSign, color: 'yellow' },
    { id: 'api', name: 'API Usage Analytics', icon: Menu, color: 'cyan' }
  ]);

  // Invoice numbering state
  const [invoiceMode, setInvoiceMode] = useState<'automatic' | 'manual'>('automatic');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(1);
  const [manualInvoiceInput, setManualInvoiceInput] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');

  // Logo upload state
  const [currentLogo, setCurrentLogo] = useState<{url: string, originalName: string, uploadedAt: string} | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMessage, setLogoMessage] = useState('');
  const [backgroundProcessing, setBackgroundProcessing] = useState(false);
  
  // Logo scaling state (stored as percentage, default 100%)
  const [logoScale, setLogoScale] = useState(() => {
    const saved = localStorage.getItem('logoScale');
    return saved ? parseInt(saved) : 100;
  });

  // Logo scaling helper functions
  const updateLogoScale = (newScale: number) => {
    // Clamp scale between 25% and 300%
    const clampedScale = Math.max(25, Math.min(300, newScale));
    setLogoScale(clampedScale);
    localStorage.setItem('logoScale', clampedScale.toString());
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('logoScaleChanged', { detail: clampedScale }));
  };

  const increaseLogoScale = () => {
    updateLogoScale(logoScale + 5);
  };

  const decreaseLogoScale = () => {
    updateLogoScale(logoScale - 5);
  };

  // Load invoice numbering settings from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('invoiceNumberingMode') as 'automatic' | 'manual' || 'automatic';
    const savedNext = parseInt(localStorage.getItem('nextInvoiceNumber') || '1');
    setInvoiceMode(savedMode);
    setNextInvoiceNumber(savedNext);
  }, []);

  // Update logo state when data changes
  useEffect(() => {
    if (logoData && typeof logoData === 'object' && 'logo' in logoData && logoData.logo) {
      setCurrentLogo(logoData.logo as { url: string; originalName: string; uploadedAt: string });
    } else {
      setCurrentLogo(null);
    }
  }, [logoData]);

  // Save invoice numbering settings to localStorage
  const saveInvoiceSettings = (mode: 'automatic' | 'manual', nextNumber: number) => {
    localStorage.setItem('invoiceNumberingMode', mode);
    localStorage.setItem('nextInvoiceNumber', nextNumber.toString());
    setInvoiceMode(mode);
    setNextInvoiceNumber(nextNumber);
  };

  // Handle manual starting point submission
  const handleManualStartingPoint = () => {
    const inputNumber = parseInt(manualInvoiceInput);
    if (isNaN(inputNumber) || inputNumber < 1) {
      setConfirmationMessage('Please enter a valid invoice number (1 or higher)');
      setTimeout(() => setConfirmationMessage(''), 3000);
      return;
    }
    
    const nextNumber = inputNumber + 1;
    saveInvoiceSettings('automatic', nextNumber);
    setConfirmationMessage(`Starting at Invoice #${inputNumber.toString().padStart(3, '0')} — next invoice will be #${nextNumber.toString().padStart(3, '0')}`);
    setManualInvoiceInput('');
    setTimeout(() => setConfirmationMessage(''), 5000);
  };

  // Logo library upload mutation (adds to library)
  const logoLibraryUploadMutation = useMutation({
    mutationFn: async (data: { file: File; name: string }) => {
      const formData = new FormData();
      formData.append('logo', data.file);
      formData.append('name', data.name);
      const response = await fetch('/api/logo-library', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add logo to library');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logo-library'] });
      setLogoMessage('Logo added to library successfully!');
      setTimeout(() => setLogoMessage(''), 3000);
    },
    onError: (error: Error) => {
      setLogoMessage(error.message);
      setTimeout(() => setLogoMessage(''), 5000);
    }
  });

  // Logo selection mutation (select from library)
  const logoSelectMutation = useMutation({
    mutationFn: async (logoId: number) => {
      return apiRequest(`/api/users/1/logo/select`, {
        method: 'POST',
        body: { logoId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/1/logo`] });
      setLogoMessage('Logo selected successfully!');
      setTimeout(() => setLogoMessage(''), 3000);
    },
    onError: (error: Error) => {
      setLogoMessage(error.message);
      setTimeout(() => setLogoMessage(''), 5000);
    }
  });

  // Logo delete from library mutation (admin only)
  const logoLibraryDeleteMutation = useMutation({
    mutationFn: async (logoId: number) => {
      const response = await fetch(`/api/logo-library/${logoId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete logo from library');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logo-library'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/1/logo`] });
      setLogoMessage('Logo removed from library');
      setTimeout(() => setLogoMessage(''), 3000);
    },
    onError: (error: Error) => {
      setLogoMessage(error.message);
      setTimeout(() => setLogoMessage(''), 5000);
    }
  });

  // Handle logo upload to library
  const handleLogoLibraryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setLogoMessage('Invalid file type. Only JPG, PNG, and SVG files are allowed.');
      setTimeout(() => setLogoMessage(''), 5000);
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setLogoMessage('File too large. Maximum size is 5MB.');
      setTimeout(() => setLogoMessage(''), 5000);
      return;
    }

    // Generate a clean name from filename (remove extension)
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    
    // Upload to library
    logoLibraryUploadMutation.mutate({ file, name: cleanName });
    
    // Clear the input
    event.target.value = '';
  };

  // Handle logo selection from library
  const handleLogoSelect = (logoId: number) => {
    logoSelectMutation.mutate(logoId);
  };

  // Handle logo deletion from library
  const handleLogoDelete = (logoId: number) => {
    if (confirm('Are you sure you want to delete this logo from the library?')) {
      logoLibraryDeleteMutation.mutate(logoId);
    }
  };

  // Re-check tax configuration when component mounts or localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setIsTaxConfigured(checkTaxConfiguration());
    };

    // Check on mount
    setIsTaxConfigured(checkTaxConfiguration());

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case localStorage is updated by same tab
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [expandedSection]); // Re-check when sections expand/collapse

  const handleLogout = () => {
    // Preserve important user preferences before clearing
    const taxSetupCompleted = localStorage.getItem('taxSetupCompleted');
    const logoScale = localStorage.getItem('logoScale');
    const invoiceNumberingMode = localStorage.getItem('invoiceNumberingMode');
    const nextInvoiceNumber = localStorage.getItem('nextInvoiceNumber');
    
    // Complete authentication reset
    localStorage.clear();
    sessionStorage.clear();
    
    // Restore preserved preferences
    if (taxSetupCompleted) localStorage.setItem('taxSetupCompleted', taxSetupCompleted);
    if (logoScale) localStorage.setItem('logoScale', logoScale);
    if (invoiceNumberingMode) localStorage.setItem('invoiceNumberingMode', invoiceNumberingMode);
    if (nextInvoiceNumber) localStorage.setItem('nextInvoiceNumber', nextInvoiceNumber);
    
    logout();
    // Force hard reload to clear all cached state
    window.location.href = window.location.origin;
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="p-6">
      {/* Back and Logout buttons in original position */}
      <div className="flex justify-between items-start mb-20">
        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        {/* Logout button with custom SVG */}
        <div className="flex items-center">
          <Button
            onClick={handleLogout}
            variant="outline" 
            size="sm"
            className="text-orange-400 border-orange-400 hover:bg-orange-400 hover:text-white flex items-center gap-2 bg-transparent"
            title="Logout"
          >
          <svg
            width={18}
            height={18}
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="m 3 5 v 0.003906 c -0.265625 0 -0.519531 0.105469 -0.707031 0.289063 l -2 2 c -0.3906252 0.390625 -0.3906252 1.023437 0 1.414062 l 2 2 c 0.1875 0.183594 0.441406 0.289063 0.707031 0.285157 v 0.007812 h 1 v -2 h 5 c 0.550781 0 1 -0.449219 1 -1 s -0.449219 -1 -1 -1 h -5 v -2 z m 0 0"/>
            <path d="m 6.820312 1.097656 c 2.394532 -0.40625 4.910157 0.453125 6.546876 2.398438 c 2.175781 2.597656 2.175781 6.40625 0 9 c -2.179688 2.597656 -5.929688 3.257812 -8.863282 1.5625 c -0.230468 -0.132813 -0.398437 -0.351563 -0.46875 -0.605469 c -0.066406 -0.257813 -0.03125 -0.53125 0.101563 -0.761719 c 0.277343 -0.476562 0.886719 -0.640625 1.367187 -0.363281 c 2.105469 1.214844 4.765625 0.75 6.328125 -1.117187 c 1.5625 -1.863282 1.5625 -4.5625 0 -6.429688 c -1.5625 -1.863281 -4.222656 -2.332031 -6.328125 -1.113281 c -0.480468 0.273437 -1.089844 0.113281 -1.367187 -0.367188 c -0.132813 -0.226562 -0.167969 -0.5 -0.101563 -0.757812 c 0.070313 -0.257813 0.238282 -0.476563 0.46875 -0.609375 c 0.730469 -0.421875 1.515625 -0.699219 2.316406 -0.835938 z m 0 0"/>
          </svg>
          Logout
        </Button>
        </div>
      </div>

      {/* Settings header positioned closer to Gmail container */}
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-gray-400" />
      </div>

      {/* Sortable Settings Sections */}
      <ReactSortable 
        list={settingsSections} 
        setList={setSettingsSections}
        animation={150}
        handle=".drag-handle"
        className="space-y-4"
      >
        {settingsSections.map((section) => {
          const renderSectionContent = () => {
            switch(section.id) {
              case 'gmail':
                return (
                  <div>
                    <div 
                      className="flex items-center justify-between p-4 rounded-lg border-2 border-red-400 bg-gray-900/20 cursor-pointer hover:bg-gray-800/30 transition-colors"
                      onClick={() => toggleSection('gmail')}
                    >
                      <div className="flex items-center gap-4">
                        <Menu className="h-5 w-5 text-red-400 flex-shrink-0 drag-handle cursor-grab" />
                        <img src="/gmail-logo.png" alt="Gmail" className="h-5 w-5 flex-shrink-0" />
                        <span className="text-lg font-medium text-red-400 whitespace-nowrap">Gmail sync</span>
                      </div>
                      <ChevronRight 
                        className={`h-5 w-5 text-red-400 transition-transform ${
                          expandedSection === 'gmail' ? 'rotate-90' : 'rotate-180'
                        }`} 
                      />
                    </div>
                    
                    {expandedSection === 'gmail' && (
                      <div className="mt-4 p-4 rounded-lg border border-red-400/30 bg-gray-900/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {!gmailStatus?.connected && (
                              <div
                                onClick={() => {
                                  window.open('/api/gmail/auth/1', '_blank');
                                }}
                                className="bg-red-500 hover:bg-red-600 text-black px-3 py-1 text-xs rounded-full cursor-pointer whitespace-nowrap"
                              >
                                Sync Gmail
                              </div>
                            )}
                            <div 
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                gmailStatus?.connected ? 'bg-green-500 cursor-default' : 'bg-red-500 cursor-not-allowed'
                              }`}
                            >
                              <div 
                                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                  gmailStatus?.connected ? 'translate-x-5' : 'translate-x-0.5'
                                }`}
                              ></div>
                            </div>
                            <span className={`text-xs whitespace-nowrap ${
                              gmailStatus?.connected ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {gmailStatus?.connected ? 'Connected' : 'Disconnected'}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowGmailPopup(true);
                            }}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            title="Gmail Integration Info"
                          >
                            <svg className="w-4 h-4 text-red-400" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                              <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );

              case 'logo':
                return (
                  <div>
                    <div 
                      className="flex items-center justify-between p-4 rounded-lg border-2 border-blue-400 bg-gray-900/20 cursor-pointer hover:bg-gray-800/30 transition-colors"
                      onClick={() => toggleSection('logo')}
                    >
                      <div className="flex items-center gap-4">
                        <Menu className="h-5 w-5 text-blue-400 flex-shrink-0 drag-handle cursor-grab" />
                        <Settings className="h-5 w-5 text-blue-400" />
                        <span className="text-lg font-medium text-blue-400">Business Logo</span>
                        <div className={`px-3 py-2 rounded-full text-xs font-medium ${
                          currentLogo 
                            ? 'bg-purple-500 text-white' 
                            : 'bg-gray-500 text-black'
                        }`}>
                          {currentLogo ? 'PRO' : 'None'}
                        </div>
                      </div>
                      <ChevronRight 
                        className={`h-5 w-5 text-blue-400 transition-transform ${
                          expandedSection === 'logo' ? 'rotate-90' : 'rotate-180'
                        }`} 
                      />
                    </div>
                    
                    {expandedSection === 'logo' && (
                      <div className="mt-4 p-6 rounded-lg border border-blue-400/30 bg-gray-900/10">
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium text-blue-400 mb-4">Business Logo Library</h3>
                          
                          {/* Current Logo Display */}
                          {currentLogo && (
                            <div className="space-y-4">
                              <div className="p-4 rounded-lg bg-gray-800/50 border">
                                <h4 className="text-white font-medium mb-3">Current Logo</h4>
                                
                                {/* Large Preview Container */}
                                <div className="logo-preview-container bg-[#1a1a1a] border-2 border-[#444] rounded-lg p-6 flex flex-col items-center justify-center w-full min-h-[200px] mb-4">
                                  <div className="flex items-center justify-center flex-1 min-h-[120px]">
                                    <img 
                                      src={currentLogo.url} 
                                      alt="Business Logo" 
                                      className="max-w-full max-h-[120px] object-contain"
                                      style={{ transform: `scale(${logoScale / 100})` }}
                                    />
                                  </div>
                                  {/* Logo Scale Controls */}
                                  <div className="flex items-center gap-2 mt-4">
                                    <button
                                      onClick={decreaseLogoScale}
                                      disabled={logoScale <= 25}
                                      className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                                      title="Decrease size (5%)"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="text-sm text-gray-300 min-w-[50px] text-center font-medium">
                                      {logoScale}%
                                    </span>
                                    <button
                                      onClick={increaseLogoScale}
                                      disabled={logoScale >= 300}
                                      className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                                      title="Increase size (5%)"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Logo Information Below Preview */}
                                <div className="space-y-3">
                                  <p className="text-gray-300 text-sm">
                                    <strong>File:</strong> {currentLogo.originalName}
                                  </p>

                                  {/* Background Removal Button */}
                                  {currentLogo.originalName?.toLowerCase().includes('.png') && (
                                    <div>
                                      <Button
                                        onClick={async () => {
                                          setBackgroundProcessing(true);
                                          try {
                                            const response = await apiRequest('/api/users/1/logo/remove-background', {
                                              method: 'POST'
                                            });
                                            if ((response as any)?.success) {
                                              setLogoMessage('Background removed successfully!');
                                              queryClient.invalidateQueries({ queryKey: ['/api/users/1/logo'] });
                                              setTimeout(() => setLogoMessage(''), 3000);
                                            }
                                          } catch (error) {
                                            setLogoMessage('Failed to remove background. Please try again.');
                                            setTimeout(() => setLogoMessage(''), 3000);
                                          }
                                          setBackgroundProcessing(false);
                                        }}
                                        disabled={backgroundProcessing}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                      >
                                        {backgroundProcessing ? 'Processing...' : 'Remove Background'}
                                      </Button>
                                      <p className="text-xs text-gray-400 mt-1">
                                        Removes white backgrounds from PNG files
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Upload to Library Section */}
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Add Logo to Library
                              </label>
                              <div className="flex items-center gap-4">
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/svg+xml"
                                  onChange={handleLogoLibraryUpload}
                                  className="hidden"
                                  id="logo-library-upload"
                                />
                                <label
                                  htmlFor="logo-library-upload"
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer transition-colors"
                                >
                                  <Upload className="h-4 w-4" />
                                  Logo
                                </label>
                                <span className="text-sm text-gray-400">
                                  Max 5MB
                                </span>
                              </div>
                            </div>

                            {/* Logo Library - Pro Section */}
                            <div className="space-y-3">
                              <h4 className="text-white font-medium">Logo Library</h4>
                              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                                {logoLibrary.map((logo: any) => (
                                  <div key={logo.id} className="relative group">
                                    <button
                                      onClick={() => handleLogoSelect(logo.id)}
                                      disabled={logoSelectMutation.isPending}
                                      className="w-full p-3 rounded-lg border border-gray-600 hover:border-blue-400 transition-colors bg-gray-800/50"
                                    >
                                      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded p-2 mb-2 border border-gray-700">
                                        <img 
                                          src={logo.filename} 
                                          alt={logo.name} 
                                          className="w-full h-12 object-contain"
                                        />
                                      </div>
                                      <span className="text-xs text-gray-300">{logo.originalName}</span>
                                    </button>
                                    
                                    {/* Delete button for uploaded logos */}
                                    {logo.isDemo === 'false' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleLogoDelete(logo.id);
                                        }}
                                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity shadow-lg"
                                        title="Delete logo"
                                      >
                                        <span className="text-xs font-bold">×</span>
                                      </button>
                                    )}
                                  </div>
                                ))}
                                
                                {logoLibrary.length === 0 && (
                                  <div className="col-span-2 text-center py-8 text-gray-400">
                                    No logos in library. Upload some logos to get started.
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Status Message */}
                            {logoMessage && (
                              <div className={`p-3 rounded-lg ${
                                logoMessage.includes('successfully') || logoMessage.includes('removed')
                                  ? 'bg-green-500/10 border border-green-400/30'
                                  : 'bg-red-500/10 border border-red-400/30'
                              }`}>
                                <p className={`text-sm ${
                                  logoMessage.includes('successfully') || logoMessage.includes('removed')
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                }`}>
                                  {logoMessage}
                                </p>
                              </div>
                            )}

                            {/* Upload Progress */}
                            {logoLibraryUploadMutation.isPending && (
                              <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                                <span className="text-blue-400 text-sm">Adding logo to library...</span>
                              </div>
                            )}

                            {/* Selection Progress */}
                            {logoSelectMutation.isPending && (
                              <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                                <span className="text-blue-400 text-sm">Selecting logo...</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-300">
                              <span className="font-medium">How it works:</span> Upload logos to your library, then select one to use for invoices and estimates. 
                              Click any logo in the library to make it your active business logo.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );

              case 'contextual-logos':
                return (
                  <div>
                    <div 
                      className="flex items-center justify-between p-4 rounded-lg border-2 border-indigo-400 bg-gray-900/20 cursor-pointer hover:bg-gray-800/30 transition-colors"
                      onClick={() => toggleSection('contextual-logos')}
                    >
                      <div className="flex items-center gap-4">
                        <Menu className="h-5 w-5 text-indigo-400 flex-shrink-0 drag-handle cursor-grab" />
                        <Building2 className="h-5 w-5 text-indigo-400" />
                        <span className="text-lg font-medium text-indigo-400">Contextual Logos</span>
                        <div className="px-3 py-2 rounded-full text-xs font-medium bg-indigo-500 text-white">
                          PRO
                        </div>
                      </div>
                      <ChevronRight 
                        className={`h-5 w-5 text-indigo-400 transition-transform ${
                          expandedSection === 'contextual-logos' ? 'rotate-90' : 'rotate-180'
                        }`} 
                      />
                    </div>
                    
                    {expandedSection === 'contextual-logos' && (
                      <div className="mt-4 p-6 rounded-lg border border-indigo-400/30 bg-gray-900/10">
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium text-indigo-400 mb-4">Set Different Logos for Different Contexts</h3>
                          
                          {/* Homepage Logo */}
                          <div className="space-y-3">
                            <h4 className="text-white font-medium flex items-center gap-2">
                              <Home className="h-4 w-4" />
                              Homepage & Sign-in Logo
                            </h4>
                            <p className="text-sm text-gray-400">Logo shown on homepage and login screen</p>
                            <ContextualLogoSelector logoType="homepage" />
                          </div>

                          {/* Business Logo */}
                          <div className="space-y-3">
                            <h4 className="text-white font-medium flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Business Documents Logo
                            </h4>
                            <p className="text-sm text-gray-400">Logo used for invoices and estimates</p>
                            <ContextualLogoSelector logoType="business" />
                          </div>

                          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-300">
                              <span className="font-medium">Pro Feature:</span> Set different logos for different parts of your app. 
                              Use your Paint Brain logo for the homepage and A-Frame logo for professional documents.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );

              case 'timezone':
                return (
                  <div>
                    <div 
                      className="flex items-center justify-between p-4 rounded-lg border-2 border-green-400 bg-gray-900/20 cursor-pointer hover:bg-gray-800/30 transition-colors"
                      onClick={() => toggleSection('timezone')}
                    >
                      <div className="flex items-center gap-4">
                        <Menu className="h-5 w-5 text-green-400 flex-shrink-0 drag-handle cursor-grab" />
                        <Globe className="h-5 w-5 text-green-400" />
                        <span className="text-lg font-medium text-green-400">Time Zone</span>
                        <div className="px-3 py-2 rounded-full text-xs font-medium bg-green-500 text-black">
                          {selectedTimezone === 'eastern' ? 'Eastern' : 
                           selectedTimezone === 'central' ? 'Central' : 'Pacific'}
                        </div>
                      </div>
                      <ChevronRight 
                        className={`h-5 w-5 text-green-400 transition-transform ${
                          expandedSection === 'timezone' ? 'rotate-90' : 'rotate-180'
                        }`} 
                      />
                    </div>
                    
                    {expandedSection === 'timezone' && (
                      <div className="mt-4 p-6 rounded-lg border border-green-400/30 bg-gray-900/10">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium text-green-400 mb-4">North American Time Zones</h3>
                          
                          <div className="space-y-3">
                            {/* Eastern Time Zone */}
                            <div 
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedTimezone === 'eastern' 
                                  ? 'border-green-400 bg-green-400/10' 
                                  : 'border-gray-600 hover:border-green-400/50'
                              }`}
                              onClick={() => {
                                setSelectedTimezone('eastern');
                                localStorage.setItem('selectedTimezone', 'eastern');
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-white">Eastern Time (ET)</div>
                                  <div className="text-sm text-gray-400">UTC-5 (Standard) / UTC-4 (Daylight)</div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  selectedTimezone === 'eastern' ? 'bg-green-400 border-green-400' : 'border-gray-400'
                                }`} />
                              </div>
                            </div>

                            {/* Central Time Zone */}
                            <div 
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedTimezone === 'central' 
                                  ? 'border-green-400 bg-green-400/10' 
                                  : 'border-gray-600 hover:border-green-400/50'
                              }`}
                              onClick={() => {
                                setSelectedTimezone('central');
                                localStorage.setItem('selectedTimezone', 'central');
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-white">Central Time (CT)</div>
                                  <div className="text-sm text-gray-400">UTC-6 (Standard) / UTC-5 (Daylight)</div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  selectedTimezone === 'central' ? 'bg-green-400 border-green-400' : 'border-gray-400'
                                }`} />
                              </div>
                            </div>

                            {/* Pacific Time Zone */}
                            <div 
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedTimezone === 'pacific' 
                                  ? 'border-green-400 bg-green-400/10' 
                                  : 'border-gray-600 hover:border-green-400/50'
                              }`}
                              onClick={() => {
                                setSelectedTimezone('pacific');
                                localStorage.setItem('selectedTimezone', 'pacific');
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-white">Pacific Time (PT)</div>
                                  <div className="text-sm text-gray-400">UTC-8 (Standard) / UTC-7 (Daylight)</div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  selectedTimezone === 'pacific' ? 'bg-green-400 border-green-400' : 'border-gray-400'
                                }`} />
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                            <p className="text-sm text-gray-400">
                              <strong className="text-green-400">Note:</strong> This setting affects how dates and times are displayed throughout the application. 
                              The selected timezone will be used for all date calculations and displays.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );

              case 'invoice':
                return (
                  <div>
                    <div 
                      className="flex items-center justify-between p-4 rounded-lg border-2 border-purple-400 bg-gray-900/20 cursor-pointer hover:bg-gray-800/30 transition-colors"
                      onClick={() => toggleSection('invoice')}
                    >
                      <div className="flex items-center gap-4">
                        <Menu className="h-5 w-5 text-purple-400 flex-shrink-0 drag-handle cursor-grab" />
                        <FileText className="h-5 w-5 text-purple-400" />
                        <span className="text-lg font-medium text-purple-400">Invoice Numbering</span>
                        <div className="px-3 py-2 rounded-full text-xs font-medium bg-purple-500 text-black">
                          Next: {nextInvoiceNumber.toString().padStart(3, '0')}
                        </div>
                      </div>
                      <ChevronRight 
                        className={`h-5 w-5 text-purple-400 transition-transform ${
                          expandedSection === 'invoice' ? 'rotate-90' : 'rotate-180'
                        }`} 
                      />
                    </div>
                    
                    {expandedSection === 'invoice' && (
                      <div className="mt-4 p-6 rounded-lg border border-purple-400/30 bg-gray-900/10">
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium text-purple-400 mb-4">Invoice Numbering Settings</h3>
                          
                          {/* Automatic Invoice Numbering Option */}
                          <div 
                            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                              invoiceMode === 'automatic' 
                                ? 'border-purple-400 bg-purple-400/10' 
                                : 'border-gray-600 hover:border-purple-400/50'
                            }`}
                            onClick={() => setInvoiceMode('automatic')}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <div className="font-medium text-white flex items-center gap-2">
                                  Automatic Invoice Numbering
                                  <span className="text-xs px-2 py-1 bg-purple-400 text-black rounded-full">DEFAULT</span>
                                </div>
                                <div className="text-sm text-gray-400 mt-1">App will automatically assign the next invoice number</div>
                              </div>
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                invoiceMode === 'automatic' ? 'bg-purple-400 border-purple-400' : 'border-gray-400'
                              }`} />
                            </div>
                            
                            {invoiceMode === 'automatic' && (
                              <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                                <p className="text-sm text-purple-400 font-medium">
                                  Next Invoice Number: {nextInvoiceNumber.toString().padStart(3, '0')}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Manual Starting Point Option */}
                          <div className="space-y-4">
                            <div className="font-medium text-white">Manual Starting Point</div>
                            <div className="flex gap-3 items-end">
                              <div className="flex-1">
                                <label className="block text-sm text-gray-400 mb-2">
                                  Enter the next invoice number to use
                                </label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={manualInvoiceInput}
                                  onChange={(e) => setManualInvoiceInput(e.target.value)}
                                  placeholder="e.g., 346"
                                  className="bg-gray-800 border-gray-600 text-white"
                                />
                              </div>
                              <Button
                                onClick={handleManualStartingPoint}
                                disabled={!manualInvoiceInput || parseInt(manualInvoiceInput) < 1}
                                className="bg-purple-500 hover:bg-purple-600 text-white"
                              >
                                Set
                              </Button>
                            </div>
                            
                            {confirmationMessage && (
                              <div className={`p-3 rounded-lg ${
                                confirmationMessage.includes('valid') 
                                  ? 'bg-red-500/10 border border-red-400/30' 
                                  : 'bg-green-500/10 border border-green-400/30'
                              }`}>
                                <p className={`text-sm ${
                                  confirmationMessage.includes('valid') ? 'text-red-400' : 'text-green-400'
                                }`}>
                                  {confirmationMessage}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                            <p className="text-sm text-gray-400">
                              <strong className="text-purple-400">Note:</strong> Once set, all new invoices will automatically increment the stored number by 1 unless you change it again in settings.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );

              case 'tax':
                return (
                  <div>
                    <div 
                      className="flex items-center justify-between p-4 rounded-lg border-2 border-yellow-400 bg-gray-900/20 cursor-pointer hover:bg-gray-800/30 transition-colors"
                      onClick={() => toggleSection('tax')}
                    >
                      <div className="flex items-center gap-4">
                        <Menu className="h-5 w-5 text-yellow-400 drag-handle cursor-grab" />
                        <svg className="h-5 w-5 text-yellow-400" style={{verticalAlign: 'middle', fill: 'currentColor', overflow: 'hidden'}} viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6.177687 752.921613h121.032322s74.637758-82.702418 155.318128-100.85788h344.932294c27.734612 0 50.419219 22.695863 50.419219 50.428428 0 27.734612-22.684606 50.428429-50.419219 50.428429H480.32055c-18.306911 0-33.279898 14.984243-33.279898 33.279898 0 18.285422 14.963777 33.32083 33.279898 33.279897l257.414206-0.497325 195.862462-159.727546c21.923268-17.880193 54.359963-15.08555 72.453004 6.67399 17.980477 21.63879 15.054851 54.46127-6.67399 72.431515L715.761346 972.788744H6.177687v-219.867131zM567.412943 472.954807c65.879298-10.961634 100.368741-53.516761 100.368741-104.585778 0-63.056002-49.727465-85.497062-94.598329-102.472655-35.769597-13.33877-69.121126-22.44106-69.121125-47.288931 0-19.414126 14.548315-32.751873 44.871887-32.751873 25.469017 0 49.107343 12.130247 73.366814 29.104817l40.015286-53.962921c-24.360779-18.143183-55.364848-35.829972-94.903274-40.594476V58.34164c0-3.921302-3.211128-7.131407-7.13243-7.131407h-49.381588c-3.911068 0-7.121174 3.210105-7.121174 7.131407v65.859855c-51.688116 13.044058-83.394172 50.347588-83.394172 99.252316 0 56.391222 49.727465 82.469105 92.770708 98.834809 35.778806 13.948659 70.948747 25.469017 70.948747 50.935987 0 21.222305-15.157181 35.769597-49.117576 35.769597-31.533117 0-60.637934-13.33877-90.952297-36.988352l-40.625174 55.791566c26.422737 22.095183 63.492953 39.233481 100.368741 45.410145v64.620634c0 3.921302 3.210105 7.121174 7.121173 7.121173H560.27949c3.921302 0 7.13243-3.199872 7.13243-7.121173v-64.87339z" fill="currentColor" />
                        </svg>
                        <span className="text-lg font-medium text-yellow-400">Taxes</span>
                        <div className={`px-3 py-2 rounded-full text-xs font-medium ${
                          isTaxConfigured 
                            ? 'bg-yellow-500 text-black' 
                            : 'bg-red-500 text-black'
                        }`}>
                          {isTaxConfigured ? 'Configured' : 'Set Up'}
                        </div>
                      </div>
                      <ChevronRight 
                        className={`h-5 w-5 text-yellow-400 transition-transform ${
                          expandedSection === 'tax' ? 'rotate-90' : 'rotate-180'
                        }`} 
                      />
                    </div>
                    
                    {expandedSection === 'tax' && (
                      <div className="mt-4 p-6 rounded-lg border border-yellow-400/30 bg-gray-900/10">
                        <TaxConfiguration />
                      </div>
                    )}
                  </div>
                );

              case 'photo':
                return (
                  <div>
                    <div 
                      className="flex items-center justify-between p-4 rounded-lg border-2 border-orange-400 bg-gray-900/20 cursor-pointer hover:bg-gray-800/30 transition-colors"
                      onClick={() => toggleSection('photo')}
                    >
                      <div className="flex items-center gap-4">
                        <Menu className="h-5 w-5 text-orange-400 flex-shrink-0 drag-handle cursor-grab" />
                        <Camera className="h-5 w-5 text-orange-400" />
                        <span className="text-lg font-medium text-orange-400">Photo Quality</span>
                        <div className="px-3 py-2 rounded-full text-xs font-medium bg-orange-500 text-black">
                          {photoCompressionLevel === 'low' ? 'Low' : 
                           photoCompressionLevel === 'medium' ? 'Medium' : 
                           photoCompressionLevel === 'original' ? 'Original' : 'High'}
                        </div>
                      </div>
                      <ChevronRight 
                        className={`h-5 w-5 text-orange-400 transition-transform ${
                          expandedSection === 'photo' ? 'rotate-90' : 'rotate-180'
                        }`} 
                      />
                    </div>
                    
                    {expandedSection === 'photo' && (
                      <div className="mt-4 p-6 rounded-lg border border-orange-400/30 bg-gray-900/10">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium text-orange-400 mb-4">Photo Compression Settings</h3>
                          
                          <div className="space-y-3">
                            {/* Low Quality Option */}
                            <div 
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                photoCompressionLevel === 'low' 
                                  ? 'border-orange-400 bg-orange-400/10' 
                                  : 'border-gray-600 hover:border-orange-400/50'
                              }`}
                              onClick={() => {
                                setPhotoCompressionLevel('low');
                                localStorage.setItem('photoCompressionLevel', 'low');
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-white">Low Quality</div>
                                  <div className="text-sm text-gray-400">60% quality • 1200×800 resolution • Saves storage</div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  photoCompressionLevel === 'low' ? 'bg-orange-400 border-orange-400' : 'border-gray-400'
                                }`} />
                              </div>
                            </div>

                            {/* Medium Quality Option */}
                            <div 
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                photoCompressionLevel === 'medium' 
                                  ? 'border-orange-400 bg-orange-400/10' 
                                  : 'border-gray-600 hover:border-orange-400/50'
                              }`}
                              onClick={() => {
                                setPhotoCompressionLevel('medium');
                                localStorage.setItem('photoCompressionLevel', 'medium');
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-white">Medium Quality</div>
                                  <div className="text-sm text-gray-400">80% quality • 1920×1080 resolution • Balanced</div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  photoCompressionLevel === 'medium' ? 'bg-orange-400 border-orange-400' : 'border-gray-400'
                                }`} />
                              </div>
                            </div>

                            {/* High Quality Option - Pro Only */}
                            <div 
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                photoCompressionLevel === 'high' 
                                  ? 'border-orange-400 bg-orange-400/10' 
                                  : 'border-gray-600 hover:border-orange-400/50'
                              }`}
                              onClick={() => {
                                setPhotoCompressionLevel('high');
                                localStorage.setItem('photoCompressionLevel', 'high');
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-white">High Quality</div>
                                  <div className="text-sm text-gray-400">90% quality • 2400×1600 resolution • Best detail</div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  photoCompressionLevel === 'high' ? 'bg-orange-400 border-orange-400' : 'border-gray-400'
                                }`} />
                              </div>
                            </div>

                            {/* Original Quality Option - Pro Only */}
                            <div 
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                photoCompressionLevel === 'original' 
                                  ? 'border-orange-400 bg-orange-400/10' 
                                  : 'border-gray-600 hover:border-orange-400/50'
                              }`}
                              onClick={() => {
                                setPhotoCompressionLevel('original');
                                localStorage.setItem('photoCompressionLevel', 'original');
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-white">Original Quality</div>
                                  <div className="text-sm text-gray-400">No compression • Full resolution • Original file size</div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  photoCompressionLevel === 'original' ? 'bg-orange-400 border-orange-400' : 'border-gray-400'
                                }`} />
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-300">
                              <span className="font-medium">Note:</span> Receipt processing always uses optimized compression for cost savings. 
                              This setting only affects photo gallery uploads.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );

              case 'api':
                return (
                  <div>
                    <div 
                      className="flex items-center p-4 rounded-lg border-2 border-cyan-400 bg-gray-900/20 cursor-pointer hover:bg-gray-800/30 transition-colors"
                      onClick={() => toggleSection('api')}
                    >
                      <div className="flex items-center gap-4">
                        <Menu className="h-5 w-5 text-cyan-400 flex-shrink-0 drag-handle cursor-grab" />
                        <svg className="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="text-lg font-medium text-cyan-400 whitespace-nowrap">API Usage</span>
                      </div>
                      
                      <div className="flex-1 flex justify-end items-center pr-4">
                        <div className="text-cyan-400 text-lg font-medium">
                          $5.43
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <ChevronRight 
                          className={`h-5 w-5 text-cyan-400 transition-transform ${
                            expandedSection === 'api' ? 'rotate-90' : 'rotate-180'
                          }`} 
                        />
                      </div>
                    </div>
                    
                    {expandedSection === 'api' && (
                      <div className="mt-4 p-6 rounded-lg border border-cyan-400/30 bg-gray-900/10">
                        <RecentActivityContent />
                      </div>
                    )}
                  </div>
                );



              default:
                return null;
            }
          };

          return (
            <div key={section.id} className="mb-4">
              {renderSectionContent()}
            </div>
          );
        })}
      </ReactSortable>

      {/* Gmail Info Popup */}
      {showGmailPopup && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center"
          onClick={() => setShowGmailPopup(false)}
        >
          <div 
            className="bg-black text-yellow-400 w-11/12 max-w-xs p-3 rounded-lg shadow-lg border border-gray-600"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                onClick={() => setShowGmailPopup(false)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="pr-6 text-left">
              <ul className="text-left text-sm space-y-1 list-none">
                <li>• Sync Paint Brain with your Gmail account to send emails directly from your address.</li>
                <li>• They'll appear in your Gmail Sent folder.</li>
                <li>• Your Gmail handles security & storage.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Contextual Logo Selector Component
interface ContextualLogoSelectorProps {
  logoType: string;
}

const ContextualLogoSelector: React.FC<ContextualLogoSelectorProps> = ({ logoType }) => {
  const queryClient = useQueryClient();
  
  // Get current contextual logo
  const { data: contextualLogo } = useQuery({
    queryKey: [`/api/users/1/logos/${logoType}`],
    select: (data: any) => data?.logo || null
  });

  // Get logo library
  const { data: logoLibrary = [] } = useQuery<any[]>({
    queryKey: ['/api/logo-library'],
  });

  // Mutation to set contextual logo
  const setContextualLogoMutation = useMutation({
    mutationFn: async (logoId: number) => {
      return apiRequest(`/api/users/1/logos/${logoType}/select`, {
        method: 'POST',
        body: JSON.stringify({ logoId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/1/logos/${logoType}`] });
    }
  });

  return (
    <div className="space-y-4">
      {/* Current Logo Display */}
      {contextualLogo && (
        <div className="p-3 bg-gray-800 rounded-lg border border-gray-600">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded border">
              <img 
                src={contextualLogo.url} 
                alt={contextualLogo.originalName} 
                className="w-full h-full object-contain rounded"
              />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Current Logo</div>
              <div className="text-xs text-gray-400">{contextualLogo.originalName}</div>
            </div>
          </div>
        </div>
      )}

      {/* Logo Selection Grid */}
      <div>
        <h5 className="text-sm font-medium text-gray-300 mb-3">Select from Library</h5>
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
          {logoLibrary.map((logo: any) => (
            <button
              key={logo.id}
              onClick={() => setContextualLogoMutation.mutate(logo.id)}
              disabled={setContextualLogoMutation.isPending}
              className={`p-2 rounded border transition-colors ${
                contextualLogo?.url === logo.filename
                  ? 'border-indigo-400 bg-indigo-400/10'
                  : 'border-gray-600 hover:border-indigo-400/50 bg-gray-800/50'
              }`}
            >
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded p-1 mb-1 border border-gray-700">
                <img 
                  src={logo.filename} 
                  alt={logo.name} 
                  className="w-full h-8 object-contain"
                />
              </div>
              <span className="text-xs text-gray-400 truncate block">{logo.originalName}</span>
            </button>
          ))}
          
          {logoLibrary.length === 0 && (
            <div className="col-span-3 text-center py-8 text-gray-400 text-sm">
              No logos available. Upload some logos to the library first.
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {setContextualLogoMutation.isPending && (
        <div className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-400/30 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-400"></div>
          <span className="text-indigo-400 text-sm">Setting {logoType} logo...</span>
        </div>
      )}

      {setContextualLogoMutation.isError && (
        <div className="p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
          <p className="text-red-400 text-sm">Failed to set logo. Please try again.</p>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;