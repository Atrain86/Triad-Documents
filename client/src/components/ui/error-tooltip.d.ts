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
export default function ErrorTooltip({ isVisible, context, onClose, onRetry }: ErrorTooltipProps): import("react/jsx-runtime").JSX.Element;
export {};
