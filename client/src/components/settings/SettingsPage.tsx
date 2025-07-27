import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Settings, DollarSign, Globe, Mail, ChevronRight, Info, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {recentUsageLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-transparent p-4 rounded-lg border border-purple-600/30">
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
            <div key={entry.id} className="bg-transparent p-4 rounded-lg border border-purple-600/30">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-purple-200 capitalize">{entry.operation.replace('_', ' ')}</p>
                    <span className="text-xs px-2 py-1 bg-purple-500/20 text-black rounded">
                      {formatNumber(entry.tokensUsed)} tokens
                    </span>
                  </div>
                  <p className="text-sm text-purple-400">{formatDate(entry.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-indigo-300">{formatCurrency(entry.estimatedCost)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-transparent p-4 rounded-lg border border-purple-600/30">
          <p className="text-purple-400 text-center">No recent activity</p>
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
      <div className="flex justify-between items-start mb-16">
        <div>
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Settings</h1>
          </div>
        </div>
        
        {/* Logout button with custom SVG */}
        <div className="flex items-center">
          <Button
            onClick={handleLogout}
            variant="outline" 
            size="sm"
            className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white flex items-center gap-2 bg-transparent"
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

      {/* Gmail Integration Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between p-4 rounded-lg border-2 border-red-400 bg-gray-900/20">
          <div className="flex items-center gap-3">
            <Menu className="h-5 w-5 text-red-400" />
            <svg className="h-5 w-5" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.58,19.1068l-12.69-8.0757A3,3,0,0,1,7.1109,5.97l9.31,5.9243L24.78,6.0428A3,3,0,0,1,28.22,10.9579Z" fill="#ea4335"/>
              <path d="M25.5,5.5h4a0,0,0,0,1,0,0v18a3,3,0,0,1-3,3h0a3,3,0,0,1-3-3V7.5a2,2,0,0,1,2-2Z" fill="#34a853" transform="translate(53.0001 32.0007) rotate(180)"/>
              <path d="M29.4562,8.0656c-.0088-.06-.0081-.1213-.0206-.1812-.0606-.2888-.2692-.5283-.5541-.6372a2.9835,2.9835,0,0,0-1.0717-.2009c-.0717-.0041-.1441.0047-.2166.0047h-2.2a.5.5,0,0,0-.5.5v18a2.5,2.5,0,0,0,2.5,2.5h0a2.5,2.5,0,0,0,2.5-2.5V8.5609A.9838.9838,0,0,0,29.4562,8.0656Z" fill="#fbbc05"/>
              <polygon points="12.77 19.67 5.5 15.13 5.5 25.5 12.77 19.67" fill="#34a853"/>
              <path d="M2.5,5.5h4v18a3,3,0,0,1-3,3h0a3,3,0,0,1-3-3V7.5a2,2,0,0,1,2-2Z" fill="#4285f4"/>
            </svg>
            {!gmailStatus?.connected && (
              <div
                onClick={() => {
                  window.open('/api/gmail/auth/1', '_blank');
                }}
                className="bg-green-500 hover:bg-green-600 text-black px-3 py-2 text-xs rounded-full cursor-pointer whitespace-nowrap"
              >
                Connect Gmail
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Status</span>
              <div className={`w-3 h-3 rounded-full ${
                gmailStatus?.connected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowGmailPopup(true);
            }}
            className="cursor-pointer bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm hover:bg-blue-600 transition-colors ml-4"
            title="Gmail Integration Info"
          >
            i
          </button>
        </div>
      </div>

      {/* Tax Configuration Section */}
      <div className="mb-4">
        <div 
          className="flex items-center justify-between p-4 rounded-lg border-2 border-yellow-400 bg-gray-900/20 cursor-pointer hover:bg-gray-800/30 transition-colors"
          onClick={() => toggleSection('tax')}
        >
          <div className="flex items-center gap-4">
            <Menu className="h-5 w-5 text-yellow-400" />
            <svg className="h-5 w-5 text-yellow-400" style={{verticalAlign: 'middle', fill: 'currentColor', overflow: 'hidden'}} viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.177687 752.921613h121.032322s74.637758-82.702418 155.318128-100.85788h344.932294c27.734612 0 50.419219 22.695863 50.419219 50.428428 0 27.734612-22.684606 50.428429-50.419219 50.428429H480.32055c-18.306911 0-33.279898 14.984243-33.279898 33.279898 0 18.285422 14.963777 33.32083 33.279898 33.279897l257.414206-0.497325 195.862462-159.727546c21.923268-17.880193 54.359963-15.08555 72.453004 6.67399 17.980477 21.63879 15.054851 54.46127-6.67399 72.431515L715.761346 972.788744H6.177687v-219.867131zM567.412943 472.954807c65.879298-10.961634 100.368741-53.516761 100.368741-104.585778 0-63.056002-49.727465-85.497062-94.598329-102.472655-35.769597-13.33877-69.121126-22.44106-69.121125-47.288931 0-19.414126 14.548315-32.751873 44.871887-32.751873 25.469017 0 49.107343 12.130247 73.366814 29.104817l40.015286-53.962921c-24.360779-18.143183-55.364848-35.829972-94.903274-40.594476V58.34164c0-3.921302-3.211128-7.131407-7.13243-7.131407h-49.381588c-3.911068 0-7.121174 3.210105-7.121174 7.131407v65.859855c-51.688116 13.044058-83.394172 50.347588-83.394172 99.252316 0 56.391222 49.727465 82.469105 92.770708 98.834809 35.778806 13.948659 70.948747 25.469017 70.948747 50.935987 0 21.222305-15.157181 35.769597-49.117576 35.769597-31.533117 0-60.637934-13.33877-90.952297-36.988352l-40.625174 55.791566c26.422737 22.095183 63.492953 39.233481 100.368741 45.410145v64.620634c0 3.921302 3.210105 7.121174 7.121173 7.121173H560.27949c3.921302 0 7.13243-3.199872 7.13243-7.121173v-64.87339z" fill="currentColor" />
            </svg>
            <span className="text-lg font-medium text-yellow-400">Tax Configuration</span>
            <div className="bg-yellow-500 text-black px-3 py-2 rounded-full text-xs font-medium">
              Configured
            </div>
          </div>
          <ChevronRight 
            className={`h-5 w-5 text-yellow-400 transition-transform ${
              expandedSection === 'tax' ? 'rotate-90' : ''
            }`} 
          />
        </div>
        
        {expandedSection === 'tax' && (
          <div className="mt-4 p-6 rounded-lg border border-yellow-400/30 bg-gray-900/10">
            <TaxConfiguration />
          </div>
        )}
      </div>

      {/* API Usage Section */}
      <div className="mb-4">
        <div className="p-4 rounded-lg border-2 border-blue-400 bg-gray-900/20">
          <AdminDashboard onBack={onBack} hideBackButton={true} />
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="mb-4">
        <div 
          className="flex items-center justify-between p-4 rounded-lg border-2 border-purple-400 bg-gray-900/20 cursor-pointer hover:bg-gray-800/30 transition-colors"
          onClick={() => toggleSection('activity')}
        >
          <div className="flex items-center gap-4">
            <Menu className="h-5 w-5 text-purple-400" />
            <span className="text-lg font-medium text-purple-400">Recent Activity</span>
          </div>
          <ChevronRight 
            className={`h-5 w-5 text-purple-400 transition-transform ${
              expandedSection === 'activity' ? 'rotate-90' : ''
            }`} 
          />
        </div>
        
        {expandedSection === 'activity' && (
          <div className="mt-4 p-6 rounded-lg border border-purple-400/30 bg-gray-900/10">
            <RecentActivityContent />
          </div>
        )}
      </div>

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