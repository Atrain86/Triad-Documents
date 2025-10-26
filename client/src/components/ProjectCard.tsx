import React from 'react';
import { 
  LucideProps, 
  Edit as EditIcon, 
  Trash2 as DeleteIcon 
} from 'lucide-react';
import { LucideIconWrapper } from './LucideIconWrapper';

export interface Project {
  id: string;
  name: string;
  type: "paint" | "repair" | "quote";
  description?: string;
  icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
}

interface ProjectCardProps {
  project: Project;
  onEdit?: () => void;
  onDelete?: () => void;
}

const PROJECT_COLORS = {
  paint: {
    border: 'border-[#6B4C9A]',
    bg: 'bg-[#6B4C9A]/10',
    text: 'text-[#6B4C9A]'
  },
  repair: {
    border: 'border-[#EF6C30]',
    bg: 'bg-[#EF6C30]/10',
    text: 'text-[#EF6C30]'
  },
  quote: {
    border: 'border-green-500',
    bg: 'bg-green-500/10',
    text: 'text-green-500'
  }
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  onEdit, 
  onDelete 
}) => {
  const colors = PROJECT_COLORS[project.type];
  const ProjectIcon = project.icon;

  return (
    <div 
      className={`
        relative 
        flex 
        items-center 
        p-4 
        rounded-xl 
        border 
        ${colors.border} 
        ${colors.bg}
        hover:bg-gray-800/50 
        transition-colors 
        duration-200
      `}
    >
      <div className="mr-4">
        <LucideIconWrapper 
          icon={ProjectIcon} 
          className={`${colors.text}`} 
          size={24} 
          strokeWidth={1.5} 
        />
      </div>
      
      <div className="flex-grow">
        <h3 className={`text-lg font-semibold ${colors.text}`}>
          {project.name}
        </h3>
        {project.description && (
          <p className="text-gray-400 text-sm mt-1">
            {project.description}
          </p>
        )}
      </div>
      
      <div className="flex space-x-2">
        {onEdit && (
          <button 
            onClick={onEdit} 
            className="text-blue-500 hover:text-blue-400 transition-colors"
            aria-label="Edit Project"
          >
            <LucideIconWrapper 
              icon={EditIcon} 
              size={20} 
              strokeWidth={1.5} 
            />
          </button>
        )}
        
        {onDelete && (
          <button 
            onClick={onDelete} 
            className="text-red-500 hover:text-red-400 transition-colors"
            aria-label="Delete Project"
          >
            <LucideIconWrapper 
              icon={DeleteIcon} 
              size={20} 
              strokeWidth={1.5} 
            />
          </button>
        )}
      </div>
    </div>
  );
};
