import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Clock, Receipt, Users } from "lucide-react";
import { Project, DailyHours, Receipt as ReceiptType } from "../../../shared/schema";

interface ProjectSummaryProps {
  project: Project;
}

export default function ProjectSummary({ project }: ProjectSummaryProps) {
  const { data: hoursEntries = [] } = useQuery<DailyHours[]>({
    queryKey: ['/api/projects', project.id, 'hours'],
  });

  const { data: receipts = [] } = useQuery<ReceiptType[]>({
    queryKey: ['/api/projects', project.id, 'receipts'],
  });

  // Calculate live totals
  const totalHours = hoursEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const totalLaborCost = hoursEntries.reduce((sum, entry) => {
    const rate = entry.hourlyRate || 50;
    return sum + (entry.hours * rate);
  }, 0);
  const totalMaterialCost = receipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount || "0"), 0);
  const totalProjectCost = totalLaborCost + totalMaterialCost;

  // Group hours by worker
  const workerHours = hoursEntries.reduce((acc, entry) => {
    const worker = entry.workerName || "Primary Worker";
    if (!acc[worker]) {
      acc[worker] = { hours: 0, cost: 0, rate: entry.hourlyRate || 50 };
    }
    acc[worker].hours += entry.hours;
    acc[worker].cost += entry.hours * (entry.hourlyRate || 50);
    return acc;
  }, {} as Record<string, { hours: number; cost: number; rate: number }>);

  const profitMargin = project.estimate ? project.estimate - totalProjectCost : 0;
  const profitPercentage = project.estimate && project.estimate > 0 
    ? ((profitMargin / project.estimate) * 100).toFixed(1) 
    : "0";

  return (
    <div className="space-y-6">
      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Labor Cost</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalLaborCost.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Receipt className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Materials</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalMaterialCost.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalProjectCost.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Analysis */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Profit Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Estimated Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${project.estimate ? project.estimate.toLocaleString() : "0"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Projected Profit</p>
              <p className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                ${profitMargin.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Profit Margin</p>
              <p className={`text-2xl font-bold ${parseFloat(profitPercentage) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {profitPercentage}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Worker Breakdown */}
      {Object.keys(workerHours).length > 0 && (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Worker Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(workerHours).map(([worker, data]) => (
                <div key={worker} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{worker}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">${data.rate}/hour</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">{data.hours.toFixed(1)} hours</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">${data.cost.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Progress */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Project Progress</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">Status</span>
              <span className="font-medium text-gray-900 dark:text-white">{project.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            </div>
            {project.statusDetails && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Details</span>
                <span className="font-medium text-gray-900 dark:text-white">{project.statusDetails}</span>
              </div>
            )}
            {project.scheduledStartDate && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Scheduled Start</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(project.scheduledStartDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {project.scheduledEndDate && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Scheduled End</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(project.scheduledEndDate).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">Receipts Logged</span>
              <span className="font-medium text-gray-900 dark:text-white">{receipts.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">Time Entries</span>
              <span className="font-medium text-gray-900 dark:text-white">{hoursEntries.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}