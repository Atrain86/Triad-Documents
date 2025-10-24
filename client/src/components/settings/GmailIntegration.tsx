import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Mail, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface GmailStatus {
  connected: boolean;
  gmailAddress?: string;
}

export default function GmailIntegration() {
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check Gmail connection status
  const checkGmailStatus = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/gmail/status/${user.id}`);
      const data = await response.json();
      setGmailStatus(data);
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      toast({
        title: "Gmail Setup Needed",
        description: "Gmail OAuth requires test user approval in Google Cloud Console. Using clipboard backup for now.",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkGmailStatus();
  }, [user]);

  // Connect Gmail account
  const connectGmail = async () => {
    if (!user?.id) return;

    try {
      setIsConnecting(true);
      console.log('Starting Gmail connection for user:', user.id);
      
      // Get OAuth URL from backend
      const response = await fetch(`/api/gmail/auth/${user.id}`);
      console.log('OAuth URL response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('OAuth URL error:', errorData);
        throw new Error(errorData.error || 'Failed to get authentication URL');
      }
      
      const data = await response.json();
      console.log('OAuth URL data:', data);
      
      if (data.authUrl) {
        console.log('Opening OAuth popup with URL:', data.authUrl);
        
        // Open OAuth URL in new window
        const popup = window.open(
          data.authUrl,
          'gmail-auth',
          'width=600,height=700,scrollbars=yes,resizable=yes,left=' + 
          (window.screen.width / 2 - 300) + ',top=' + (window.screen.height / 2 - 350)
        );

        if (!popup) {
          throw new Error('Popup blocked. Please allow popups for this site.');
        }

        let pollCount = 0;
        const maxPolls = 300; // 5 minutes at 1 second intervals

        // Enhanced polling with better error detection
        const pollTimer = setInterval(() => {
          pollCount++;
          console.log(`Polling OAuth popup... (${pollCount}/${maxPolls})`);
          
          try {
            // Check if popup is closed
            if (popup.closed) {
              console.log('OAuth popup closed, checking connection status...');
              clearInterval(pollTimer);
              setIsConnecting(false);
              
              // Recheck status after OAuth flow with delay
              setTimeout(() => {
                console.log('Rechecking Gmail status after OAuth...');
                checkGmailStatus();
              }, 2000);
              return;
            }

            // Try to access popup URL to detect successful callback
            try {
              const popupUrl = popup.location.href;
              if (popupUrl.includes('/api/gmail/callback')) {
                console.log('OAuth callback detected in popup URL');
                clearInterval(pollTimer);
                setIsConnecting(false);
                popup.close();
                setTimeout(checkGmailStatus, 2000);
                return;
              }
            } catch (e) {
              // Cross-origin error is expected during OAuth flow
            }

            // Timeout after maximum polls
            if (pollCount >= maxPolls) {
              console.log('OAuth polling timeout reached');
              clearInterval(pollTimer);
              setIsConnecting(false);
              if (!popup.closed) {
                popup.close();
              }
              toast({
                title: "Connection Timeout",
                description: "Gmail connection attempt timed out. Please try again.",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error('Error during OAuth polling:', error);
            clearInterval(pollTimer);
            setIsConnecting(false);
            setTimeout(checkGmailStatus, 2000);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      setIsConnecting(false);
      toast({
        title: "Connection Failed",
        description: "Failed to initiate Gmail connection",
        variant: "destructive",
      });
    }
  };

  // Disconnect Gmail account
  const disconnectGmail = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/gmail/disconnect/${user.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setGmailStatus({ connected: false });
        toast({
          title: "Gmail Disconnected",
          description: "Your Gmail account has been disconnected successfully",
        });
      } else {
        throw new Error('Failed to disconnect Gmail');
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect Gmail account",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail size={20} />
            Gmail Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gmail Integration Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-red-400">Gmail Integration</h2>
        <p className="text-[#DCDCAA] text-sm">
          Connect your Gmail account to send emails from your own Gmail address. 
          Emails will appear in your Gmail Sent folder.
        </p>
      </div>

      {/* Connection Status Container with Creative Border */}
      <div className="relative p-6 rounded-xl border-2 border-red-400/50 bg-gradient-to-r from-red-900/10 to-red-800/5 backdrop-blur-sm">
        {/* Decorative corner elements */}
        <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-red-400 rounded-tl-lg"></div>
        <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-red-400 rounded-tr-lg"></div>
        <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-red-400 rounded-bl-lg"></div>
        <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-red-400 rounded-br-lg"></div>
        
        <div className="flex items-center gap-4">
          {gmailStatus.connected ? (
            <>
              <CheckCircle className="text-green-500" size={32} />
              <div className="flex-1">
                <div className="text-xl font-bold text-red-300">Gmail Connection Status</div>
                <div className="text-lg font-semibold text-red-400 mt-1">Connected</div>
                <div className="text-sm text-[#DCDCAA] mt-1">
                  {gmailStatus.gmailAddress}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectGmail}
                className="text-red-600 hover:text-red-700 border-red-400 hover:bg-red-900/20"
              >
                Disconnect
              </Button>
            </>
          ) : (
            <>
              <XCircle className="text-red-400" size={32} />
              <div className="flex-1">
                <div className="text-xl font-bold text-red-300">Gmail Connection Status</div>
                <div className="text-lg font-semibold text-red-400 mt-1">Not Connected</div>
                <div className="text-sm text-[#DCDCAA] mt-1">
                  No Gmail account connected
                </div>
              </div>
              <Button
                onClick={connectGmail}
                disabled={isConnecting}
                className="flex items-center gap-2 bg-[#6A9955] hover:bg-[#5A8945] text-white border-[#6A9955]"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink size={16} />
                    Connect Gmail
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>





      {/* Success Message */}
      {gmailStatus.connected && (
        <div className="bg-green-900/20 border border-green-400/30 p-4 rounded-lg">
          <h4 className="font-medium text-green-400 text-lg">
            Gmail Connected Successfully!
          </h4>
          <p className="text-sm text-[#DCDCAA] mt-1">
            You can now send invoices and estimates directly from your Gmail account. 
            All sent emails will appear in your Gmail Sent folder for proper record keeping.
          </p>
        </div>
      )}
    </div>
  );
}