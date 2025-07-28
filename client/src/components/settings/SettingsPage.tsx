import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Settings, DollarSign, Globe, Mail, ChevronRight, Info, Menu, X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReactSortable } from 'react-sortablejs';

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

  // Define sortable sections
  const [settingsSections, setSettingsSections] = useState([
    { id: 'gmail', name: 'Gmail Integration', icon: Mail, color: 'red' },
    { id: 'photo', name: 'Photo Quality', icon: Camera, color: 'orange' },
    { id: 'tax', name: 'Tax Configuration', icon: DollarSign, color: 'yellow' },
    { id: 'api', name: 'API Usage Analytics', icon: Menu, color: 'cyan' }
  ]);

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
    // Complete authentication reset
    localStorage.clear();
    sessionStorage.clear();
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
        <Settings className="h-8 w-8 text-cyan-400" />
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

                            {/* High Quality Option - Admin Only */}
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
                                  <div className="font-medium text-white flex items-center gap-2">
                                    High Quality
                                    <span className="text-xs px-2 py-1 bg-orange-400 text-black rounded-full">ADMIN</span>
                                  </div>
                                  <div className="text-sm text-gray-400">90% quality • 2400×1600 resolution • Best detail</div>
                                </div>
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  photoCompressionLevel === 'high' ? 'bg-orange-400 border-orange-400' : 'border-gray-400'
                                }`} />
                              </div>
                            </div>

                            {/* Original Quality Option - Admin Only */}
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
                                  <div className="font-medium text-white flex items-center gap-2">
                                    Original Quality
                                    <span className="text-xs px-2 py-1 bg-orange-400 text-black rounded-full">ADMIN</span>
                                  </div>
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
                      
                      <div className="flex-1 flex justify-center items-center gap-6">
                        <div className="text-cyan-400 text-xl font-semibold">
                          103,409 Tokens
                        </div>
                        <div className="text-cyan-400 text-xl font-semibold">
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

export default SettingsPage;