import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { DailyHours } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface HoursTrackerProps {
  projectId: number;
}

export default function HoursTracker({ projectId }: HoursTrackerProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: "",
    description: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: hoursEntries = [], isLoading } = useQuery<DailyHours[]>({
    queryKey: ['/api/projects', projectId, 'hours'],
  });

  const addHoursMutation = useMutation({
    mutationFn: async (data: { date: string; hours: number; description?: string }) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/hours`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'hours'] });
      toast({
        title: "Success",
        description: "Hours logged successfully.",
      });
      setFormData({
        date: new Date().toISOString().split('T')[0],
        hours: "",
        description: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to log hours. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.date || !formData.hours) {
      toast({
        title: "Error",
        description: "Please fill in date and hours.",
        variant: "destructive",
      });
      return;
    }

    addHoursMutation.mutate({
      date: formData.date,
      hours: parseFloat(formData.hours),
      description: formData.description || undefined,
    });
  };

  const totalHours = hoursEntries.reduce((sum, entry) => sum + entry.hours, 0);

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading hours...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Time Tracking</h3>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{totalHours.toFixed(1)}</p>
        </div>
      </div>

      {/* Hours Entry Form */}
      <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 mb-6">
        <CardContent className="p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Log Daily Hours</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="hours">Hours Worked</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                placeholder="8.0"
                className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Work description"
                className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSubmit}
                disabled={addHoursMutation.isPending}
                className="w-full bg-secondary text-white hover:bg-green-700"
              >
                {addHoursMutation.isPending ? "Adding..." : "Add Hours"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hours History */}
      <div className="space-y-3">
        {hoursEntries.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>No hours logged yet. Use the form above to log your first day.</p>
          </div>
        ) : (
          hoursEntries
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((entry) => (
              <Card key={entry.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(entry.date).toLocaleDateString()}
                      </p>
                      {entry.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{entry.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{entry.hours} hrs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  );
}
