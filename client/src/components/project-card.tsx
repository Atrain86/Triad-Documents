import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home } from "lucide-react";
import type { Project } from "@shared/schema";

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
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

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
              <Home className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">{project.clientName}</h3>
              <p className="text-sm text-gray-500">{project.address}</p>
              <div className="flex items-center mt-1">
                <Badge className={getStatusColor(project.status)}>
                  {getStatusLabel(project.status)}
                </Badge>
                <span className="text-xs text-gray-500 ml-2">
                  {project.roomCount} rooms
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {project.estimate ? `$${project.estimate.toLocaleString()}` : 'No estimate'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
