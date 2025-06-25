import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface ProjectNotesProps {
  project: Project;
}

export default function ProjectNotes({ project }: ProjectNotesProps) {
  const [notes, setNotes] = useState(project.notes || "");
  const [clientPreferences, setClientPreferences] = useState(project.clientPreferences || "");
  const [specialRequirements, setSpecialRequirements] = useState(project.specialRequirements || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateProjectMutation = useMutation({
    mutationFn: async (data: { notes?: string; clientPreferences?: string; specialRequirements?: string }) => {
      const response = await apiRequest("PUT", `/api/projects/${project.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id] });
      toast({
        title: "Success",
        description: "Notes saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save notes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveNotes = () => {
    updateProjectMutation.mutate({
      notes: notes || undefined,
      clientPreferences: clientPreferences || undefined,
      specialRequirements: specialRequirements || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Project Notes</h3>
        <Textarea
          rows={6}
          placeholder="Add notes about the project, special requirements, client preferences, etc..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="resize-none"
        />
      </div>

      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Client Preferences</h4>
        <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <Textarea
              rows={4}
              placeholder="Enter client preferences such as preferred paint brands, work hours, special considerations, etc."
              value={clientPreferences}
              onChange={(e) => setClientPreferences(e.target.value)}
              className="resize-none border-0 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </CardContent>
        </Card>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Special Requirements</h4>
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <Textarea
              rows={4}
              placeholder="Enter any special requirements or important notes that need attention..."
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              className="resize-none border-0 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </CardContent>
        </Card>
      </div>

      <Button 
        onClick={saveNotes}
        disabled={updateProjectMutation.isPending}
        className="bg-secondary text-white hover:bg-green-700"
      >
        <Save className="w-4 h-4 mr-2" />
        {updateProjectMutation.isPending ? "Saving..." : "Save Notes"}
      </Button>
    </div>
  );
}
