# Error Tooltip System Implementation Export

## Current Issue
React runtime error "Cannot access uninitialized variable" at line 430 persists despite implementing the error tooltip system. Photo uploads work on server side but UI doesn't update due to this error.

## Error Location
- **File**: `client/src/components/StreamlinedClientPage.tsx`
- **Line**: 430 (in the addHoursMutation onSuccess handler)
- **Error**: `setHoursInput('');` - temporal dead zone error

## Complete Error Tooltip System Code

### 1. Main Error Tooltip Component
**File: `client/src/components/ui/error-tooltip.tsx`**

```tsx
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
```

### 2. Error Tooltip Hook
**File: `client/src/hooks/useErrorTooltip.ts`**

```ts
import { useState, useCallback } from 'react';
import type { ErrorContext } from '@/components/ui/error-tooltip';

export function useErrorTooltip() {
  const [errorState, setErrorState] = useState<{
    isVisible: boolean;
    context: ErrorContext | null;
  }>({
    isVisible: false,
    context: null,
  });

  const showError = useCallback((context: ErrorContext) => {
    setErrorState({
      isVisible: true,
      context,
    });

    // Auto-hide after 8 seconds unless it has a retry action
    if (!context.retryAction) {
      setTimeout(() => {
        setErrorState(prev => ({ ...prev, isVisible: false }));
      }, 8000);
    }
  }, []);

  const hideError = useCallback(() => {
    setErrorState(prev => ({ ...prev, isVisible: false }));
  }, []);

  const showNetworkError = useCallback((retryAction?: () => void) => {
    showError({
      action: 'connect',
      type: 'network',
      error: 'Network connection failed',
      retryAction,
    });
  }, [showError]);

  const showUploadError = useCallback((type: 'photo' | 'receipt', error: Error | string, retryAction?: () => void) => {
    showError({
      action: 'upload',
      type,
      error,
      retryAction,
    });
  }, [showError]);

  const showDeleteError = useCallback((type: 'photo' | 'receipt' | 'project', error: Error | string, retryAction?: () => void) => {
    showError({
      action: 'delete',
      type,
      error,
      retryAction,
    });
  }, [showError]);

  const showSaveError = useCallback((type: 'project' | 'hours', error: Error | string, retryAction?: () => void) => {
    showError({
      action: 'save',
      type,
      error,
      retryAction,
    });
  }, [showError]);

  const showLoadError = useCallback((type: 'photo' | 'project' | 'hours', error: Error | string, retryAction?: () => void) => {
    showError({
      action: 'load',
      type,
      error,
      retryAction,
    });
  }, [showError]);

  const showPermissionError = useCallback((error: Error | string, retryAction?: () => void) => {
    showError({
      action: 'permission',
      type: 'file',
      error,
      retryAction,
    });
  }, [showError]);

  return {
    errorState,
    showError,
    hideError,
    showNetworkError,
    showUploadError,
    showDeleteError,
    showSaveError,
    showLoadError,
    showPermissionError,
  };
}
```

### 3. Success Tooltip Component
**File: `client/src/components/ui/success-tooltip.tsx`**

```tsx
import React, { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessTooltipProps {
  isVisible: boolean;
  message: string;
  onClose: () => void;
}

export default function SuccessTooltip({ isVisible, message, onClose }: SuccessTooltipProps) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldShow(true);
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShouldShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!shouldShow) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-green-900 border border-green-700 rounded-lg shadow-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-sm text-white">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-green-400 hover:text-white transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Current Issue Analysis

The React runtime error persists at line 430. The issue appears to be related to state management in the mutation handlers. 

**Key Problem Areas:**
1. Line 430: `setHoursInput('');` causing temporal dead zone error
2. Photo uploads work server-side but UI doesn't update
3. Error occurs during mutation success handlers

**Server Logs Show:**
- Photo uploads successful (compression working: 252KB→105KB)
- Database storage working (ID 113 created)
- Server responding with 201 status

**Next Steps for Another AI Agent:**
1. Focus on line 430 in `client/src/components/StreamlinedClientPage.tsx`
2. Check all state variable declarations and mutation handler order
3. Consider splitting the large component into smaller ones
4. Add React Error Boundary to catch the exact error
5. The error tooltip system is complete and working - focus on resolving the underlying React state issue

The error tooltip system implementation is complete and functional. The remaining issue is the temporal dead zone error that prevents UI updates after successful operations.