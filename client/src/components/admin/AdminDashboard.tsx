import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, DollarSign, Users, Eye, Brain, Calendar, ArrowLeft, ChevronRight, Menu } from 'lucide-react';
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

      {/* API Usage - Single Line */}
      <div className="flex items-center justify-between">
        {totalStatsLoading ? (
          <>
            <div className="flex items-center gap-4">
              <Menu className="h-5 w-5 text-blue-400" />
              <span className="text-lg font-medium text-blue-400">API Usage</span>
              <div className="animate-pulse">
                <div className="h-6 bg-gray-600 rounded w-20"></div>
              </div>
            </div>
            <div className="animate-pulse">
              <div className="h-6 bg-gray-600 rounded w-16"></div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <Menu className="h-5 w-5 text-blue-400" />
                <span className="text-lg font-medium text-blue-400">API Usage</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-green-500 text-black px-3 py-1 rounded-full text-sm font-medium">
                  Tokens {formatNumber(totalStats?.totalTokens || 0)}
                </div>
                <div className="bg-green-500 text-black px-3 py-1 rounded-full text-sm font-medium">
                  {formatCurrency(totalStats?.totalCost || 0)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>



    </div>
  );
};

export default AdminDashboard;