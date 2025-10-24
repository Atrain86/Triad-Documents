import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface EstimateCalculatorProps {
  project: Project;
}

export default function EstimateCalculator({ project }: EstimateCalculatorProps) {
  const [formData, setFormData] = useState({
    roomCount: project?.roomCount?.toString() || "1",
    difficulty: project?.difficulty || "easy",
    roomType: "standard",
    baseRate: "800",
  });
  const [estimate, setEstimate] = useState<number | null>(project.estimate);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateProjectMutation = useMutation({
    mutationFn: async (estimate: number) => {
      const response = await apiRequest("PUT", `/api/projects/${project.id}`, { estimate });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Success",
        description: "Estimate saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save estimate. Please try again.",
        variant: "destructive",
      });
    },
  });

  const calculateEstimate = () => {
    const roomCount = parseInt(formData.roomCount);
    const baseRate = parseFloat(formData.baseRate);
    
    if (!roomCount || !baseRate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    let total = roomCount * baseRate;

    // Apply difficulty multiplier
    switch (formData.difficulty) {
      case "medium":
        total *= 1.1; // 10% increase
        break;
      case "hard":
        total *= 1.3; // 30% increase
        break;
    }

    // Apply room type multiplier
    switch (formData.roomType) {
      case "kitchen":
        total *= 1.3;
        break;
      case "highCeiling":
        total *= 1.2;
        break;
      case "exterior":
        total *= 1.5;
        break;
    }

    setEstimate(total);
  };

  const saveEstimate = () => {
    if (estimate) {
      updateProjectMutation.mutate(estimate);
    }
  };

  const getDifficultyAdjustment = () => {
    const baseRate = parseFloat(formData.baseRate) || 0;
    const roomCount = parseInt(formData.roomCount) || 0;
    const baseTotal = roomCount * baseRate;

    switch (formData.difficulty) {
      case "medium":
        return baseTotal * 0.1;
      case "hard":
        return baseTotal * 0.3;
      default:
        return 0;
    }
  };

  const getRoomTypeLabel = (type: string) => {
    switch (type) {
      case "standard":
        return "Standard Rooms (1.0x)";
      case "kitchen":
        return "Kitchen/Bathroom (1.3x)";
      case "highCeiling":
        return "High Ceilings (1.2x)";
      case "exterior":
        return "Exterior (1.5x)";
      default:
        return type;
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "Easy";
      case "medium":
        return "Medium";
      case "hard":
        return "Hard";
      default:
        return difficulty;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Estimate Calculator */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Project Estimate</h3>
        
        <div className="space-y-6">
          <div>
            <Label htmlFor="roomCount">Number of Rooms</Label>
            <Input
              id="roomCount"
              type="number"
              value={formData.roomCount}
              onChange={(e) => setFormData({ ...formData, roomCount: e.target.value })}
              className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <Label htmlFor="difficulty">Difficulty Level</Label>
            <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy - Standard walls, good condition</SelectItem>
                <SelectItem value="medium">Medium - Some repair work needed</SelectItem>
                <SelectItem value="hard">Hard - Extensive prep, multiple coats</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="roomType">Room Type Multiplier</Label>
            <Select value={formData.roomType} onValueChange={(value) => setFormData({ ...formData, roomType: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Rooms (1.0x)</SelectItem>
                <SelectItem value="kitchen">Kitchen/Bathroom (1.3x)</SelectItem>
                <SelectItem value="highCeiling">High Ceilings (1.2x)</SelectItem>
                <SelectItem value="exterior">Exterior (1.5x)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="baseRate">Base Rate per Room</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <Input
                id="baseRate"
                type="number"
                value={formData.baseRate}
                onChange={(e) => setFormData({ ...formData, baseRate: e.target.value })}
                className="pl-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                placeholder="800"
              />
            </div>
          </div>

          <Button 
            onClick={calculateEstimate}
            className="w-full bg-primary text-white hover:bg-blue-700"
          >
            Calculate Estimate
          </Button>
        </div>
      </div>

      {/* Estimate Breakdown */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Estimate Breakdown</h3>
        
        <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">
                  Base Cost ({formData.roomCount} rooms × ${formData.baseRate})
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${((parseInt(formData.roomCount) || 0) * (parseFloat(formData.baseRate) || 0)).toLocaleString()}
                </span>
              </div>
              
              {getDifficultyAdjustment() > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    Difficulty Adjustment ({getDifficultyLabel(formData.difficulty)})
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    +${getDifficultyAdjustment().toLocaleString()}
                  </span>
                </div>
              )}

              <Separator />
              
              <div className="flex justify-between text-lg">
                <span className="font-bold text-gray-900 dark:text-white">Total Estimate</span>
                <span className="font-bold text-primary">
                  {estimate ? `$${estimate.toLocaleString()}` : '$0'}
                </span>
              </div>
            </div>

            {estimate && (
              <div className="mt-6">
                <Button 
                  onClick={saveEstimate}
                  disabled={updateProjectMutation.isPending}
                  className="w-full bg-secondary text-white hover:bg-green-700"
                >
                  {updateProjectMutation.isPending ? "Saving..." : "Save Estimate"}
                </Button>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-300 dark:border-gray-600">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Project Timeline</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Estimated Days</span>
                  <span className="text-gray-900 dark:text-white">{Math.ceil((parseInt(formData.roomCount) || 1) * 0.75)}-{Math.ceil((parseInt(formData.roomCount) || 1) * 1)} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Hours per Day</span>
                  <span className="text-gray-900 dark:text-white">8 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Total Hours</span>
                  <span className="text-gray-900 dark:text-white">{Math.ceil((parseInt(formData.roomCount) || 1) * 0.75) * 8}-{Math.ceil((parseInt(formData.roomCount) || 1) * 1) * 8} hours</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
