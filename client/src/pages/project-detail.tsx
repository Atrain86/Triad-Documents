import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Camera, Receipt, Clock, Calculator, StickyNote, Edit } from "lucide-react";
import { Link } from "wouter";
import type { Project } from "@shared/schema";
import PhotoGrid from "@/components/photo-grid";
import ReceiptList from "@/components/receipt-list";
import HoursTracker from "@/components/hours-tracker";
import EstimateCalculator from "@/components/estimate-calculator";
import ProjectNotes from "@/components/project-notes";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || '0');

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'estimating':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Project not found</h2>
          <Link to="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Project Header */}
        <Card className="mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Link to="/">
                  <Button variant="ghost" size="sm" className="mr-4">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{project.clientName}</h1>
                  <p className="text-sm text-gray-500">{project.address}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className={getStatusColor(project.status)}>
                  {getStatusLabel(project.status)}
                </Badge>
                <Button className="bg-primary text-white hover:bg-blue-700">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Project
                </Button>
              </div>
            </div>
          </div>

          {/* Project Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{project.roomCount}</p>
              <p className="text-sm text-gray-500">Rooms</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-500">Hours Logged</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">$0</p>
              <p className="text-sm text-gray-500">Materials Cost</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary">
                {project.estimate ? `$${project.estimate.toLocaleString()}` : '$0'}
              </p>
              <p className="text-sm text-gray-500">Estimate</p>
            </div>
          </div>
        </Card>

        {/* Project Tabs */}
        <Card>
          <Tabs defaultValue="photos" className="w-full">
            <div className="border-b border-gray-200">
              <TabsList className="h-auto bg-transparent p-0">
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
                  Hours
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

            <TabsContent value="photos" className="p-6">
              <PhotoGrid projectId={projectId} />
            </TabsContent>

            <TabsContent value="receipts" className="p-6">
              <ReceiptList projectId={projectId} />
            </TabsContent>

            <TabsContent value="hours" className="p-6">
              <HoursTracker projectId={projectId} />
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
