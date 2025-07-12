import React, { useState, useEffect } from 'react';
import { AlertCircle, X, Wifi, Camera, FileX, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ErrorContext {
  action: 'upload' | 'delete' | 'save' | 'load' | 'connect' | 'permission';
  type: 'photo' | 'receipt' | 'project' | 'hours' | 'network' | 'file';
  error: Error | string;
  retryAction?: () => void;
}

interface ErrorTooltipProps {
  isVisible: boolean;
  context: ErrorContext | null;
  onClose: () => void;
  onRetry?: () => void;
}

const getErrorIcon = (context: ErrorContext) => {
  switch (context.action) {
    case 'upload':
      return <Camera className="w-5 h-5 text-orange-400" />;
    case 'delete':
      return <FileX className="w-5 h-5 text-red-400" />;
    case 'save':
      return <Clock className="w-5 h-5 text-blue-400" />;
    case 'load':
      return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    case 'connect':
      return <Wifi className="w-5 h-5 text-purple-400" />;
    case 'permission':
      return <Lock className="w-5 h-5 text-gray-400" />;
    default:
      return <AlertCircle className="w-5 h-5 text-red-400" />;
  }
};

const getErrorMessage = (context: ErrorContext): { title: string; message: string; suggestion: string } => {
  const action = context.action;
  const type = context.type;
  const errorText = typeof context.error === 'string' ? context.error : context.error.message;

  // Network-related errors
  if (errorText.includes('fetch') || errorText.includes('network') || errorText.includes('connection')) {
    return {
      title: 'Connection Problem',
      message: 'Your internet connection seems unstable right now.',
      suggestion: 'Check your wifi connection and try again.'
    };
  }

  // File size errors
  if (errorText.includes('size') || errorText.includes('large') || errorText.includes('413')) {
    return {
      title: 'File Too Large',
      message: `This ${type} file is too big to upload.`,
      suggestion: 'Try using a smaller photo or compress it first.'
    };
  }

  // Permission errors
  if (errorText.includes('permission') || errorText.includes('403') || errorText.includes('unauthorized')) {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to do this right now.',
      suggestion: 'Make sure you\'re logged in and try again.'
    };
  }

  // Server errors
  if (errorText.includes('500') || errorText.includes('server')) {
    return {
      title: 'Server Problem',
      message: 'Something went wrong on our end.',
      suggestion: 'This should fix itself in a few minutes. Try again shortly.'
    };
  }

  // Context-specific error messages
  switch (action) {
    case 'upload':
      if (type === 'photo') {
        return {
          title: 'Photo Upload Failed',
          message: 'Your photo couldn\'t be saved right now.',
          suggestion: 'Check that the file isn\'t corrupted and try selecting it again.'
        };
      } else if (type === 'receipt') {
        return {
          title: 'Receipt Upload Failed',
          message: 'Your receipt couldn\'t be processed right now.',
          suggestion: 'Make sure the image shows the receipt clearly and try again.'
        };
      }
      break;

    case 'delete':
      return {
        title: 'Delete Failed',
        message: `This ${type} couldn't be removed right now.`,
        suggestion: 'The file might be in use. Wait a moment and try again.'
      };

    case 'save':
      return {
        title: 'Save Failed',
        message: 'Your changes couldn\'t be saved.',
        suggestion: 'Check your connection and try saving again.'
      };

    case 'load':
      return {
        title: 'Loading Failed',
        message: `Your ${type} information couldn't be loaded.`,
        suggestion: 'Refresh the page or check your internet connection.'
      };

    default:
      return {
        title: 'Something Went Wrong',
        message: 'An unexpected problem occurred.',
        suggestion: 'Try refreshing the page or contact support if this keeps happening.'
      };
  }

  // Fallback
  return {
    title: 'Something Went Wrong',
    message: 'An unexpected problem occurred.',
    suggestion: 'Try refreshing the page or contact support if this keeps happening.'
  };
};

export default function ErrorTooltip({ isVisible, context, onClose, onRetry }: ErrorTooltipProps) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (isVisible && context) {
      setShouldShow(true);
    } else {
      const timer = setTimeout(() => setShouldShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, context]);

  if (!shouldShow || !context) return null;

  const { title, message, suggestion } = getErrorMessage(context);

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getErrorIcon(context)}
            <h3 className="text-sm font-medium text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="space-y-2 mb-4">
          <p className="text-sm text-gray-300">{message}</p>
          <p className="text-xs text-gray-400">{suggestion}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {(context.retryAction || onRetry) && (
            <Button
              onClick={() => {
                if (context.retryAction) {
                  context.retryAction();
                } else if (onRetry) {
                  onRetry();
                }
                onClose();
              }}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
            >
              Try Again
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-800 text-xs"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}