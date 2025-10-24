import type { ErrorContext } from '@/components/ui/error-tooltip';
export declare function useErrorTooltip(): {
    errorState: {
        isVisible: boolean;
        context: ErrorContext | null;
    };
    showError: (context: ErrorContext) => void;
    hideError: () => void;
    showNetworkError: (retryAction?: () => void) => void;
    showUploadError: (type: "photo" | "receipt", error: Error | string, retryAction?: () => void) => void;
    showDeleteError: (type: "photo" | "receipt" | "project", error: Error | string, retryAction?: () => void) => void;
    showSaveError: (type: "project" | "hours", error: Error | string, retryAction?: () => void) => void;
    showLoadError: (type: "photo" | "project" | "hours", error: Error | string, retryAction?: () => void) => void;
    showPermissionError: (error: Error | string, retryAction?: () => void) => void;
};
