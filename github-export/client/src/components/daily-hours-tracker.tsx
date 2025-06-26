import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar, Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DailyHours, InsertDailyHours } from "@/../../shared/schema";

interface DailyHoursTrackerProps {
  projectId: number;
}

const hoursSchema = z.object({
  date: z.string(),
  hours: z.number().min(0.1).max(24),
  description: z.string().min(1, "Description is required"),
  workerName: z.string().min(1, "Worker name is required"),
  hourlyRate: z.number().min(1, "Hourly rate is required"),
});

export default function DailyHoursTracker({ projectId }: DailyHoursTrackerProps) {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const { data: hours = [], isLoading } = useQuery<DailyHours[]>({
    queryKey: ['/api/projects', projectId, 'hours'],
  });

  const form = useForm<z.infer<typeof hoursSchema>>({
    resolver: zodResolver(hoursSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      hours: 8,
      description: "",
      workerName: "",
      hourlyRate: 50,
    },
  });

  const addHoursMutation = useMutation({
    mutationFn: async (data: z.infer<typeof hoursSchema>) => {
      const response = await fetch(`/api/projects/${projectId}/hours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          date: new Date(data.date),
        }),
      });
      if (!response.ok) throw new Error('Failed to add hours');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'hours'] });
      toast({
        title: "Success",
        description: "Hours added successfully.",
      });
      form.reset();
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add hours.",
        variant: "destructive",
      });
    },
  });

  const deleteHoursMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/hours/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete hours');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'hours'] });
      toast({
        title: "Success",
        description: "Hours entry deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete hours.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof hoursSchema>) => {
    addHoursMutation.mutate(data);
  };

  const totalHours = hours.reduce((sum, entry) => sum + entry.hours, 0);
  const totalCost = hours.reduce((sum, entry) => sum + (entry.hours * entry.hourlyRate), 0);

  if (isLoading) {
    return <div className="text-center text-gray-500 dark:text-gray-400">Loading hours...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Days Worked</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{hours.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-600 dark:bg-purple-400 rounded-full flex items-center justify-center text-white text-sm font-bold">$</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Labor Cost</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Hours Button */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Daily Hours
        </Button>
      )}

      {/* Add Hours Form */}
      {showForm && (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Add Daily Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours Worked</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            min="0.1"
                            max="24"
                            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="workerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Worker Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter worker name" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="1"
                            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the work performed..."
                          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit" disabled={addHoursMutation.isPending}>
                    {addHoursMutation.isPending ? "Adding..." : "Add Hours"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Hours List */}
      {hours.length > 0 && (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Daily Hours Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hours.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {format(new Date(entry.date), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {entry.hours}h @ ${entry.hourlyRate}/hr
                      </div>
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        ${(entry.hours * entry.hourlyRate).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {entry.workerName} - {entry.description}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteHoursMutation.mutate(entry.id)}
                    disabled={deleteHoursMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hours.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No hours logged yet. Add your first entry using the button above.
        </div>
      )}
    </div>
  );
}