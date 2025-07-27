import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, DollarSign, Users, Eye, Brain, Calendar, ArrowLeft, ChevronRight } from 'lucide-react';
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
  const [expandedSection, setExpandedSection] = useState<string | null>('overview');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

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
      {!hideBackButton && (
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Button>
        </div>
      )}

      {/* Usage Overview - Single Line */}
      <div className="mb-4 p-4 rounded-lg border border-blue-400/30 bg-gray-900/10">
        {totalStatsLoading ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-600 rounded w-20"></div>
              </div>
            </div>
            <div className="animate-pulse">
              <div className="h-6 bg-gray-600 rounded w-16"></div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Tokens</span>
                <span className="text-lg font-bold text-blue-300">
                  {formatNumber(totalStats?.totalTokens || 0)}
                </span>
              </div>
            </div>
            <span className="text-lg font-bold text-emerald-300">
              {formatCurrency(totalStats?.totalCost || 0)}
            </span>
          </div>
        )}
      </div>

      {/* Recent Activity Container */}
      <div className="mb-4">
        <div 
          className="flex items-center justify-between p-4 rounded-lg border-2 border-indigo-400 bg-gray-900/20 cursor-pointer hover:bg-gray-800/30 transition-colors"
          onClick={() => toggleSection('activity')}
        >
          <h2 className="text-xl font-semibold text-indigo-400">Recent Activity</h2>
          <ChevronRight 
            className={`h-5 w-5 text-indigo-400 transition-transform ${
              expandedSection === 'activity' ? 'rotate-90' : ''
            }`} 
          />
        </div>
        
        {expandedSection === 'activity' && (
          <div className="mt-4 p-6 rounded-lg border border-indigo-400/30 bg-gray-900/10">
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
                          <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
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
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;