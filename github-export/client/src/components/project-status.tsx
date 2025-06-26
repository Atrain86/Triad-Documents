import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, CheckCircle, AlertCircle, Wrench, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Project } from "../../../shared/schema";

interface ProjectStatusProps {
  project: Project;
}

const statusOptions = [
  { value: "estimating", label: "Preparing Estimate", icon: DollarSign, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900" },
  { value: "pending_approval", label: "Waiting for Approval", icon: Clock, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900" },
  { value: "approved", label: "Approved - In Queue", icon: CheckCircle, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900" },
  { value: "in_progress", label: "In Progress", icon: Wrench, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900" },
  { value: "completed", label: "Completed", icon: CheckCircle, color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-900" },
  { value: "on_hold", label: "On Hold", icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900" }
];

export default function ProjectStatus({ project }: ProjectStatusProps) {
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [statusData, setStatusData] = useState({
    status: project.status,
    statusDetails: project.statusDetails || "",
  });
  const [scheduleData, setScheduleData] = useState({
    startDate: project.scheduledStartDate ? new Date(project.scheduledStartDate).toISOString().split('T')[0] : "",
    endDate: project.scheduledEndDate ? new Date(project.scheduledEndDate).toISOString().split('T')[0] : "",
    hourlyRate: project.hourlyRate?.toString() || "50",
    helperRate: project.helperRate?.toString() || "35",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: statusData.status,
          statusDetails: statusData.statusDetails,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id] });
      toast({
        title: "Success",
        description: "Project status updated successfully.",
      });
      setIsStatusDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project status.",
        variant: "destructive",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          scheduledStartDate: scheduleData.startDate ? new Date(scheduleData.startDate).toISOString() : null,
          scheduledEndDate: scheduleData.endDate ? new Date(scheduleData.endDate).toISOString() : null,
          hourlyRate: parseFloat(scheduleData.hourlyRate),
          helperRate: parseFloat(scheduleData.helperRate),
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to update schedule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id] });
      toast({
        title: "Success",
        description: "Project schedule updated successfully.",
      });
      setIsScheduleDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project schedule.",
        variant: "destructive",
      });
    },
  });

  const currentStatus = statusOptions.find(s => s.value === project.status) || statusOptions[0];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${currentStatus.bg} mr-4`}>
                <StatusIcon className={`w-6 h-6 ${currentStatus.color}`} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Project Status</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{currentStatus.label}</p>
                {project.statusDetails && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{project.statusDetails}</p>
                )}
              </div>
            </div>
            <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                  Update Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Project Status</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={statusData.status} onValueChange={(value) => setStatusData({ ...statusData, status: value })}>
                      <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="statusDetails">Details (optional)</Label>
                    <Textarea
                      id="statusDetails"
                      value={statusData.statusDetails}
                      onChange={(e) => setStatusData({ ...statusData, statusDetails: e.target.value })}
                      placeholder="e.g., Waiting for client to respond to estimate, Materials ordered, etc."
                      className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => updateStatusMutation.mutate()}
                      disabled={updateStatusMutation.isPending}
                    >
                      {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Schedule & Rates */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg mr-4">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Schedule & Rates</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Project timeline and hourly rates</p>
              </div>
            </div>
            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                  Update Schedule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Project Schedule & Rates</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Scheduled Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={scheduleData.startDate}
                        onChange={(e) => setScheduleData({ ...scheduleData, startDate: e.target.value })}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">Scheduled End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={scheduleData.endDate}
                        onChange={(e) => setScheduleData({ ...scheduleData, endDate: e.target.value })}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hourlyRate">Your Hourly Rate</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                        <Input
                          id="hourlyRate"
                          type="number"
                          step="0.01"
                          value={scheduleData.hourlyRate}
                          onChange={(e) => setScheduleData({ ...scheduleData, hourlyRate: e.target.value })}
                          className="pl-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                          placeholder="50.00"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="helperRate">Helper Hourly Rate</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                        <Input
                          id="helperRate"
                          type="number"
                          step="0.01"
                          value={scheduleData.helperRate}
                          onChange={(e) => setScheduleData({ ...scheduleData, helperRate: e.target.value })}
                          className="pl-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                          placeholder="35.00"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => updateScheduleMutation.mutate()}
                      disabled={updateScheduleMutation.isPending}
                    >
                      {updateScheduleMutation.isPending ? "Updating..." : "Update Schedule"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Start Date:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {project.scheduledStartDate 
                    ? new Date(project.scheduledStartDate).toLocaleDateString() 
                    : "Not scheduled"
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">End Date:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {project.scheduledEndDate 
                    ? new Date(project.scheduledEndDate).toLocaleDateString() 
                    : "Not scheduled"
                  }
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Your Rate:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ${project.hourlyRate || 50}/hour
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Helper Rate:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ${project.helperRate || 35}/hour
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}