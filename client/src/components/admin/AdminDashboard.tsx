import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { makeAuthenticatedRequest } from "@/contexts/AuthContext";
import { Activity, DollarSign, Users, Zap } from "lucide-react";

interface TokenUsage {
  totalTokens: number;
  totalCost: number;
}

interface UserUsage {
  userId: number;
  email: string;
  totalTokens: number;
  totalCost: number;
}

interface AnalyticsData {
  totalUsage: TokenUsage;
  userUsage: UserUsage[];
  timestamp: string;
}

export default function AdminDashboard() {
  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => {
      const response = await makeAuthenticatedRequest("/api/admin/analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            OpenAI usage analytics and system overview
          </p>
        </div>
        <div className="text-center py-12">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            OpenAI usage analytics and system overview
          </p>
        </div>
        <div className="text-center py-12 text-red-600">
          Error loading analytics: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          OpenAI usage analytics and system overview
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens Used</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalUsage ? formatNumber(analytics.totalUsage.totalTokens) : "0"}
            </div>
            <p className="text-xs text-muted-foreground">OpenAI API tokens consumed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalUsage ? formatCurrency(analytics.totalUsage.totalCost) : "$0.0000"}
            </div>
            <p className="text-xs text-muted-foreground">OpenAI API spending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.userUsage ? analytics.userUsage.length : "0"}
            </div>
            <p className="text-xs text-muted-foreground">Users with API usage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Token</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalUsage && analytics.totalUsage.totalTokens > 0
                ? formatCurrency(analytics.totalUsage.totalCost / analytics.totalUsage.totalTokens)
                : "$0.0000"}
            </div>
            <p className="text-xs text-muted-foreground">Per token cost</p>
          </CardContent>
        </Card>
      </div>

      {/* User Usage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>User Usage Breakdown</CardTitle>
          <CardDescription>
            OpenAI API usage by individual users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics?.userUsage && analytics.userUsage.length > 0 ? (
            <div className="space-y-4">
              {analytics.userUsage.map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        User ID: {user.userId}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatNumber(user.totalTokens)} tokens</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(user.totalCost)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No user usage data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            Current system status and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Last Updated:</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {analytics?.timestamp ? new Date(analytics.timestamp).toLocaleString() : "Never"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">OpenAI Model:</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">GPT-4o Vision</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Primary Use Case:</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Receipt OCR Processing</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}