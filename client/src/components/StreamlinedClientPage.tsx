import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Camera, Receipt, Clock, Calculator, StickyNote, Edit, DollarSign, Calendar } from "lucide-react";
import type { Project } from "@shared/schema";
import WorkingPhotoGrid from "@/components/working-photo-grid";
import ReceiptList from "@/components/receipt-list";
import DailyHoursTracker from "@/components/daily-hours-tracker";
import EstimateCalculator from "@/components/estimate-calculator";
import ProjectNotes from "@/components/project-notes";
import ProjectStatus from "@/components/project-status";
import ProjectSummary from "@/components/project-summary";

interface StreamlinedClientPageProps {
  projectId: number;
  onBack: () => void;
}

export default function StreamlinedClientPage({ projectId, onBack }: StreamlinedClientPageProps) {
  const { data: project, isLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'estimating':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'estimating':
        return 'Estimating';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Project not found</h2>
          <Button variant="outline" onClick={onBack}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Project Header */}
        <Card className="mb-6">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Button variant="ghost" size="sm" className="mr-4" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-foreground">{project.clientName}</h1>
                  <p className="text-sm text-muted-foreground">{project.address}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className={getStatusColor(project.status)}>
                  {getStatusLabel(project.status)}
                </Badge>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Project
                </Button>
              </div>
            </div>
          </div>

          {/* Project Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{project.roomCount || 0}</p>
              <p className="text-sm text-muted-foreground">Rooms</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">0</p>
              <p className="text-sm text-muted-foreground">Hours Logged</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">$0</p>
              <p className="text-sm text-muted-foreground">Materials Cost</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {project.estimate ? `$${project.estimate.toLocaleString()}` : '$0'}
              </p>
              <p className="text-sm text-muted-foreground">Estimate</p>
            </div>
          </div>
        </Card>

        {/* Project Tabs */}
        <Card>
          <Tabs defaultValue="summary" className="w-full">
            <div className="border-b">
              <TabsList className="h-auto bg-transparent p-0">
                <TabsTrigger 
                  value="summary" 
                  className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-6 py-3 text-sm font-medium rounded-none"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Summary
                </TabsTrigger>
                <TabsTrigger 
                  value="status" 
                  className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-6 py-3 text-sm font-medium rounded-none"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Status
                </TabsTrigger>
                <TabsTrigger 
                  value="photos" 
                  className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-6 py-3 text-sm font-medium rounded-none"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Photos
                </TabsTrigger>
                <TabsTrigger 
                  value="receipts"
                  className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-6 py-3 text-sm font-medium rounded-none"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Receipts
                </TabsTrigger>
                <TabsTrigger 
                  value="hours"
                  className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-6 py-3 text-sm font-medium rounded-none"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Daily Hours
                </TabsTrigger>
                <TabsTrigger 
                  value="estimate"
                  className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-6 py-3 text-sm font-medium rounded-none"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Estimate
                </TabsTrigger>
                <TabsTrigger 
                  value="notes"
                  className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-6 py-3 text-sm font-medium rounded-none"
                >
                  <StickyNote className="w-4 h-4 mr-2" />
                  Notes
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="summary" className="p-6">
              <ProjectSummary project={project} />
            </TabsContent>

            <TabsContent value="status" className="p-6">
              <ProjectStatus project={project} />
            </TabsContent>

            <TabsContent value="photos" className="p-6">
              <WorkingPhotoGrid projectId={projectId} />
            </TabsContent>

            <TabsContent value="receipts" className="p-6">
              <ReceiptList projectId={projectId} />
            </TabsContent>

            <TabsContent value="hours" className="p-6">
              <DailyHoursTracker projectId={projectId} />
            </TabsContent>

            <TabsContent value="estimate" className="p-6">
              <EstimateCalculator project={project} />
            </TabsContent>

            <TabsContent value="notes" className="p-6">
              <ProjectNotes project={project} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}