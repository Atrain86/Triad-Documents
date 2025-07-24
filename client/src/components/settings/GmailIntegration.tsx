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
      
      // Get OAuth URL from backend
      const response = await fetch(`/api/gmail/auth/${user.id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get authentication URL');
      }
      
      const data = await response.json();
      
      if (data.authUrl) {
        // Open OAuth URL in new window
        const popup = window.open(
          data.authUrl,
          'gmail-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Poll for popup closure
        const pollTimer = setInterval(() => {
          try {
            if (popup?.closed) {
              clearInterval(pollTimer);
              setIsConnecting(false);
              // Recheck status after OAuth flow
              setTimeout(checkGmailStatus, 1000);
            }
          } catch (error) {
            // Cross-origin error when popup redirects
            clearInterval(pollTimer);
            setIsConnecting(false);
            setTimeout(checkGmailStatus, 1000);
          }
        }, 1000);

        // Fallback: stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(pollTimer);
          setIsConnecting(false);
          if (popup && !popup.closed) {
            popup.close();
          }
        }, 300000);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail size={20} />
          Gmail Integration
        </CardTitle>
        <CardDescription>
          Connect your Gmail account to send emails from your own Gmail address. 
          Emails will appear in your Gmail Sent folder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-3 p-4 border rounded-lg">
          {gmailStatus.connected ? (
            <>
              <CheckCircle className="text-green-500" size={24} />
              <div className="flex-1">
                <div className="font-medium">Connected</div>
                <div className="text-sm text-muted-foreground">
                  {gmailStatus.gmailAddress}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectGmail}
                className="text-red-600 hover:text-red-700"
              >
                Disconnect
              </Button>
            </>
          ) : (
            <>
              <XCircle className="text-gray-400" size={24} />
              <div className="flex-1">
                <div className="font-medium">Not Connected</div>
                <div className="text-sm text-muted-foreground">
                  No Gmail account connected
                </div>
              </div>
              <Button
                onClick={connectGmail}
                disabled={isConnecting}
                className="flex items-center gap-2"
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

        {/* Benefits */}
        <div className="space-y-2">
          <h4 className="font-medium">Benefits of Gmail Integration:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Emails sent from your own Gmail address</li>
            <li>• Sent emails appear in your Gmail Sent folder</li>
            <li>• Maintains professional email reputation</li>
            <li>• No shared account or quota limitations</li>
            <li>• Full control over your email communications</li>
          </ul>
        </div>

        {/* Requirements or Configuration Notice */}
        {!gmailStatus.connected && (
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Requirements:</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 mt-2">
              <li>• A Google/Gmail account</li>
              <li>• Permission to send emails on your behalf</li>
              <li>• OAuth2 authentication (secure, no password sharing)</li>
              <li>• Gmail OAuth2 credentials configured by administrator</li>
            </ul>
          </div>
        )}

        {gmailStatus.connected && (
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 dark:text-green-100">
              Gmail Connected Successfully!
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              You can now send invoices and estimates directly from your Gmail account. 
              All sent emails will appear in your Gmail Sent folder for proper record keeping.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}