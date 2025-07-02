import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, DollarSign, Users, Eye, Brain, Calendar } from 'lucide-react';

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

const AdminDashboard: React.FC = () => {
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
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tokens</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalStatsLoading ? 'Loading...' : formatNumber(totalStats?.totalTokens || 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalStatsLoading ? 'Loading...' : formatCurrency(totalStats?.totalCost || 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {userStatsLoading ? 'Loading...' : (userStats?.length || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Usage Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Usage by User
          </h2>
          <div className="space-y-4">
            {userStatsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : userStats && userStats.length > 0 ? (
              userStats.map((user) => (
                <div key={user.userId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatNumber(user.totalTokens)} tokens
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(user.totalCost)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No OpenAI usage data yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentUsageLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : recentUsage && recentUsage.length > 0 ? (
              recentUsage.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{entry.operation}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(entry.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatNumber(entry.tokensUsed)} tokens
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {formatCurrency(entry.estimatedCost)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
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