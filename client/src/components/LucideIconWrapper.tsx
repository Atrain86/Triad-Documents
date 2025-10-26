import React from 'react';
import { LucideProps } from 'lucide-react';

interface IconWrapperProps {
  icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const LucideIconWrapper: React.FC<IconWrapperProps> = ({
  icon: Icon,
  size = 24,
  strokeWidth = 1.5,
  className = '',
  ...props
}) => {
  return <Icon size={size} strokeWidth={strokeWidth} className={className} {...props} />;
};
