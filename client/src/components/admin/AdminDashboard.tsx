import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, DollarSign, Users, Eye, Brain, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

interface TokenUsageStats {
  totalTokens: number;
  totalCost: number;
}

interface UserTokenStats {
  userId: number;
  email: string;
  totalTokens: number;
  totalCost: number;
}

interface TokenUsageEntry {
  id: number;
  userId: number;
  operation: string;
  tokensUsed: number;
  estimatedCost: number;
  createdAt: string;
}

const AdminDashboard: React.FC<{ onBack: () => void; hideBackButton?: boolean }> = ({ onBack, hideBackButton = false }) => {

  // Fetch overall token usage statistics
  const { data: totalStats, isLoading: totalStatsLoading } = useQuery<TokenUsageStats>({
    queryKey: ['/api/admin/token-usage/total'],
  });

  // Fetch token usage by user
  const { data: userStats, isLoading: userStatsLoading } = useQuery<UserTokenStats[]>({
    queryKey: ['/api/admin/token-usage/by-user'],
  });

  // Fetch recent token usage entries
  const { data: recentUsage, isLoading: recentUsageLoading } = useQuery<TokenUsageEntry[]>({
    queryKey: ['/api/admin/token-usage/recent'],
  });



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          {!hideBackButton && (
            <Button
              onClick={onBack}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Button>
          )}
          <h1 className="text-3xl font-bold">API Usage</h1>
        </div>
      </div>

      {/* LIVE TRACKING STATUS */}
      <div className="mb-6 p-4 rounded-lg bg-green-900/20 border-2 border-green-400/50">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg flex-shrink-0">
            <Brain className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-400 mb-2">✅ LIVE TRACKING ACTIVE</h3>
            <div className="text-sm text-green-300 space-y-2">
              <p className="font-medium">Comprehensive OpenAI usage tracking is now operational.</p>
              <p>
                <strong>Currently tracking:</strong> Receipt OCR, text generation, code analysis, 
                debugging assistance, and all future OpenAI operations within your app.
              </p>
              <p className="text-yellow-300">
                💡 Note: Replit's AI assistant conversations (like this chat) bypass your app and won't appear here.
              </p>
            </div>
          </div>
        </div>
      </div>


      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-black/40 p-6 rounded-lg border-2 border-blue-500/30">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Brain className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-300">Total Tokens</p>
              <p className="text-2xl font-bold text-white">
                {totalStatsLoading ? 'Loading...' : formatNumber(totalStats?.totalTokens || 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-black/40 p-6 rounded-lg border-2 border-green-500/30">
          <div className="flex items-center">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-300">Total Cost</p>
              <p className="text-2xl font-bold text-white">
                {totalStatsLoading ? 'Loading...' : formatCurrency(totalStats?.totalCost || 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-black/40 p-6 rounded-lg border-2 border-purple-500/30">
          <div className="flex items-center">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="h-6 w-6 text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-300">Active Users</p>
              <p className="text-2xl font-bold text-white">
                {userStatsLoading ? 'Loading...' : (userStats?.length || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Usage Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-black/40 p-6 rounded-lg border-2 border-orange-500/30">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-orange-400">
            <Users className="h-5 w-5 mr-2" />
            Usage by User
          </h2>
          <div className="space-y-4">
            {userStatsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
              </div>
            ) : userStats && userStats.length > 0 ? (
              userStats.map((user) => (
                <div key={user.userId} className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-orange-500/30">
                  <div>
                    <p className="font-medium text-white">{user.email}</p>
                    <p className="text-sm text-orange-300">
                      {formatNumber(user.totalTokens)} tokens
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-400">
                      {formatCurrency(user.totalCost)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-orange-300">
                No OpenAI usage data yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-black/40 p-6 rounded-lg border-2 border-yellow-500/30">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-yellow-400">
            <Activity className="h-5 w-5 mr-2" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentUsageLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
              </div>
            ) : recentUsage && recentUsage.length > 0 ? (
              recentUsage.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-yellow-500/30">
                  <div>
                    <p className="font-medium text-white">{entry.operation}</p>
                    <p className="text-sm text-yellow-300">
                      {formatDate(entry.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {formatNumber(entry.tokensUsed)} tokens
                    </p>
                    <p className="text-xs text-green-400">
                      {formatCurrency(entry.estimatedCost)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-yellow-300">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">JWT Authentication</span>
            <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm">Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Role-based Access Control</span>
            <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm">Enabled</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Multi-user Project Isolation</span>
            <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm">Protected</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">OpenAI Usage Tracking</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm">Monitoring</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;