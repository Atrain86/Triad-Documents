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