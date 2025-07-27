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
    <div className="space-y-6">
      {/* Header */}
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
        <h1 className="text-3xl font-bold text-blue-400">API Usage</h1>
      </div>

      {/* Description */}
      <p className="text-gray-300 text-lg leading-relaxed">
        Monitor OpenAI API usage and costs for receipt processing, text generation, 
        and other AI features. Track token consumption across all users and operations.
      </p>

      {/* Usage Overview Container */}
      <div className="rounded-lg border-2 border-blue-400 bg-black/20 p-6">
        <h2 className="text-xl font-semibold text-blue-400 mb-6">Usage Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-black/40 p-4 rounded-lg border border-blue-500/30">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Total Tokens</h3>
            {totalStatsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-600 rounded mb-1"></div>
                <div className="h-3 bg-gray-600 rounded w-20"></div>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-white">
                  {formatNumber(totalStats?.totalTokens || 0)}
                </p>
                <p className="text-xs text-gray-500">API calls processed</p>
              </>
            )}
          </div>

          <div className="bg-black/40 p-4 rounded-lg border border-blue-500/30">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Total Cost</h3>
            {totalStatsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-600 rounded mb-1"></div>
                <div className="h-3 bg-gray-600 rounded w-16"></div>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(totalStats?.totalCost || 0)}
                </p>
                <p className="text-xs text-gray-500">Current period</p>
              </>
            )}
          </div>

          <div className="bg-black/40 p-4 rounded-lg border border-blue-500/30">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Active Users</h3>
            {userStatsLoading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-600 rounded mb-1"></div>
                <div className="h-3 bg-gray-600 rounded w-24"></div>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-white">
                  {userStats?.length || 0}
                </p>
                <p className="text-xs text-gray-500">Using AI features</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* User Breakdown Container */}
      <div className="rounded-lg border-2 border-cyan-400 bg-black/20 p-6">
        <h2 className="text-xl font-semibold text-cyan-400 mb-6">Usage by User</h2>
        
        {userStatsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-black/40 p-4 rounded-lg border border-cyan-500/30">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-gray-600 rounded w-48"></div>
                  <div className="h-4 bg-gray-600 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : userStats && userStats.length > 0 ? (
          <div className="space-y-3">
            {userStats.map((user) => (
              <div key={user.userId} className="bg-black/40 p-4 rounded-lg border border-cyan-500/30">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-white">{user.email}</p>
                    <p className="text-sm text-gray-400">{formatNumber(user.totalTokens)} tokens used</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-cyan-400">{formatCurrency(user.totalCost)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-black/40 p-4 rounded-lg border border-cyan-500/30">
            <p className="text-gray-400 text-center">No user data available</p>
          </div>
        )}
      </div>

      {/* Recent Activity Container */}
      <div className="rounded-lg border-2 border-indigo-400 bg-black/20 p-6">
        <h2 className="text-xl font-semibold text-indigo-400 mb-6">Recent Activity</h2>
        
        {recentUsageLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-black/40 p-4 rounded-lg border border-indigo-500/30">
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
              <div key={entry.id} className="bg-black/40 p-4 rounded-lg border border-indigo-500/30">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-white capitalize">{entry.operation.replace('_', ' ')}</p>
                      <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded">
                        {formatNumber(entry.tokensUsed)} tokens
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{formatDate(entry.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-indigo-400">{formatCurrency(entry.estimatedCost)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-black/40 p-4 rounded-lg border border-indigo-500/30">
            <p className="text-gray-400 text-center">No recent activity</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;