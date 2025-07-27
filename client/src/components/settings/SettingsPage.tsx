import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Settings, DollarSign, Globe, Mail, ChevronRight, Info, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

import AdminDashboard from '../admin/AdminDashboard';
import TaxConfiguration from './TaxConfiguration';
import GmailIntegration from './GmailIntegration';
import { useAuth } from '@/contexts/AuthContext';

interface SettingsPageProps {
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { logout } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showGmailBenefits, setShowGmailBenefits] = useState(false);

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
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
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
        <div 
          className="flex items-center justify-between p-4 rounded-lg border-2 border-red-400 bg-gray-900/20 cursor-pointer hover:bg-gray-800/30 transition-colors"
          onClick={() => toggleSection('gmail')}
        >
          <div className="flex items-center gap-4">
            <Menu className="h-5 w-5 text-red-400" />
            <Mail className="h-5 w-5 text-red-400" />
            <span className="text-lg font-medium text-red-400">Gmail Integration</span>
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
              Not Connected
            </div>
          </div>
          <ChevronRight 
            className={`h-5 w-5 text-red-400 transition-transform ${
              expandedSection === 'gmail' ? 'rotate-90' : ''
            }`} 
          />
        </div>
        
        {expandedSection === 'gmail' && (
          <div className="mt-4 p-6 rounded-lg border border-red-400/30 bg-gray-900/10">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-medium text-white">Gmail Connection Status</h3>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 text-gray-400 hover:text-white"
                onClick={() => setShowGmailBenefits(!showGmailBenefits)}
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
            
            {showGmailBenefits && (
              <div className="mb-6 p-4 rounded-lg bg-blue-900/20 border border-blue-400/30">
                <h4 className="font-medium text-blue-400 mb-2">Benefits of Gmail Integration:</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Emails sent from your own Gmail address</li>
                  <li>• Sent emails appear in your Gmail Sent folder</li>
                  <li>• Maintains professional email reputation</li>
                  <li>• No shared account or quota limitations</li>
                  <li>• Full control over your email communications</li>
                </ul>
              </div>
            )}
            
            <GmailIntegration />
          </div>
        )}
      </div>

      {/* Tax Configuration Section */}
      <div className="mb-4">
        <div 
          className="flex items-center justify-between p-4 rounded-lg border-2 border-yellow-400 bg-gray-900/20 cursor-pointer hover:bg-gray-800/30 transition-colors"
          onClick={() => toggleSection('tax')}
        >
          <div className="flex items-center gap-4">
            <Menu className="h-5 w-5 text-yellow-400" />
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9H2m4 0a3 3 0 013-3m-3 3v6m0 0a3 3 0 003 3m-3-3H2m10-6h8m-8 0a3 3 0 013-3m-3 3v6m0 0a3 3 0 003 3m-3-3h8" />
              <line x1="3" y1="3" x2="21" y2="21" strokeWidth="2.5" />
            </svg>
            <span className="text-lg font-medium text-yellow-400">Tax Configuration</span>
            <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-medium">
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

      {/* API Usage Analytics Section */}
      <div className="mb-4">
        <div 
          className="flex items-center justify-between p-4 rounded-lg border-2 border-blue-400 bg-gray-900/20 cursor-pointer hover:bg-gray-800/30 transition-colors"
          onClick={() => toggleSection('admin')}
        >
          <div className="flex items-center gap-4">
            <Menu className="h-5 w-5 text-blue-400" />
            <Globe className="h-5 w-5 text-blue-400" />
            <span className="text-lg font-medium text-blue-400">API Usage</span>
            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
              Active
            </div>
          </div>
          <ChevronRight 
            className={`h-5 w-5 text-blue-400 transition-transform ${
              expandedSection === 'admin' ? 'rotate-90' : ''
            }`} 
          />
        </div>
        
        {expandedSection === 'admin' && (
          <div className="mt-4 p-6 rounded-lg border border-blue-400/30 bg-gray-900/10">
            <AdminDashboard onBack={onBack} hideBackButton={true} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;