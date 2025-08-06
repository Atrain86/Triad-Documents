import React, { useState, useEffect } from 'react';
import { HelpCircle, X, Lightbulb, Info, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface HintConfig {
  id: string;
  title: string;
  description: string;
  type: 'tip' | 'info' | 'warning' | 'feature';
  priority: 'low' | 'medium' | 'high';
  showOnFirstVisit?: boolean;
  context?: 'homepage' | 'client-page' | 'settings' | 'estimate' | 'invoice' | 'universal';
}

interface HintTooltipProps {
  hint: HintConfig;
  isVisible?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showIcon?: boolean;
  autoHide?: boolean;
  onDismiss?: (hintId: string) => void;
  children?: React.ReactNode;
}

const getHintIcon = (type: HintConfig['type'], priority: HintConfig['priority']) => {
  const baseClasses = "w-4 h-4";
  
  switch (type) {
    case 'tip':
      return <Lightbulb className={`${baseClasses} ${priority === 'high' ? 'text-yellow-400' : 'text-yellow-300'}`} />;
    case 'info':
      return <Info className={`${baseClasses} ${priority === 'high' ? 'text-blue-400' : 'text-blue-300'}`} />;
    case 'warning':
      return <HelpCircle className={`${baseClasses} ${priority === 'high' ? 'text-orange-400' : 'text-orange-300'}`} />;
    case 'feature':
      return <ArrowRight className={`${baseClasses} ${priority === 'high' ? 'text-green-400' : 'text-green-300'}`} />;
    default:
      return <Info className={`${baseClasses} text-blue-300`} />;
  }
};

const getHintColors = (type: HintConfig['type']) => {
  switch (type) {
    case 'tip':
      return {
        bg: 'bg-yellow-900/90',
        border: 'border-yellow-700',
        text: 'text-yellow-100',
        button: 'bg-yellow-600 hover:bg-yellow-700'
      };
    case 'info':
      return {
        bg: 'bg-blue-900/90',
        border: 'border-blue-700',
        text: 'text-blue-100',
        button: 'bg-blue-600 hover:bg-blue-700'
      };
    case 'warning':
      return {
        bg: 'bg-orange-900/90',
        border: 'border-orange-700',
        text: 'text-orange-100',
        button: 'bg-orange-600 hover:bg-orange-700'
      };
    case 'feature':
      return {
        bg: 'bg-green-900/90',
        border: 'border-green-700',
        text: 'text-green-100',
        button: 'bg-green-600 hover:bg-green-700'
      };
    default:
      return {
        bg: 'bg-gray-900/90',
        border: 'border-gray-700',
        text: 'text-gray-100',
        button: 'bg-gray-600 hover:bg-gray-700'
      };
  }
};

// Simple inline tooltip for quick hints
export function InlineHint({ hint, position = 'top', showIcon = true, children }: HintTooltipProps) {
  if (children) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {children}
          </TooltipTrigger>
          <TooltipContent side={position} className="max-w-xs">
            <div className="flex items-start gap-2">
              {showIcon && getHintIcon(hint.type, hint.priority)}
              <div>
                <p className="font-medium text-sm">{hint.title}</p>
                <p className="text-xs opacity-90">{hint.description}</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-300 transition-colors">
            {getHintIcon(hint.type, hint.priority)}
            {showIcon && <span className="text-xs">Help</span>}
          </button>
        </TooltipTrigger>
        <TooltipContent side={position} className="max-w-xs">
          <div className="flex items-start gap-2">
            {showIcon && getHintIcon(hint.type, hint.priority)}
            <div>
              <p className="font-medium text-sm">{hint.title}</p>
              <p className="text-xs opacity-90">{hint.description}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Expandable hint card for detailed guidance
export function HintCard({ hint, isVisible = true, autoHide = false, onDismiss }: HintTooltipProps) {
  const [shouldShow, setShouldShow] = useState(isVisible);
  const [isExpanded, setIsExpanded] = useState(false);
  const colors = getHintColors(hint.type);

  useEffect(() => {
    if (isVisible) {
      setShouldShow(true);
      if (autoHide) {
        const timer = setTimeout(() => {
          setShouldShow(false);
        }, 8000);
        return () => clearTimeout(timer);
      }
    } else {
      const timer = setTimeout(() => setShouldShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHide]);

  const handleDismiss = () => {
    setShouldShow(false);
    if (onDismiss) {
      onDismiss(hint.id);
    }
  };

  if (!shouldShow) return null;

  return (
    <div className={`transform transition-all duration-300 ${
      isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
    }`}>
      <div className={`${colors.bg} ${colors.border} border rounded-lg shadow-lg p-4 max-w-sm`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getHintIcon(hint.type, hint.priority)}
            <h3 className={`text-sm font-medium ${colors.text}`}>{hint.title}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`${colors.text} hover:text-white transition-colors`}
            >
              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDismiss}
              className={`${colors.text} hover:text-white transition-colors`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Description */}
        <div className={`${colors.text} ${isExpanded ? 'block' : 'line-clamp-2'}`}>
          <p className="text-sm opacity-90">{hint.description}</p>
        </div>

        {/* Action button for high priority hints */}
        {hint.priority === 'high' && (
          <div className="mt-3">
            <Button
              onClick={handleDismiss}
              size="sm"
              className={`${colors.button} text-white text-xs`}
            >
              Got it!
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default HintCard;