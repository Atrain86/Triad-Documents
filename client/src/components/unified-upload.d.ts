interface UnifiedUploadProps {
    onPhotoSelect: (files: File[]) => void;
    onReceiptSelect: (files: File[]) => void;
    title?: string;
}
export default function UnifiedUpload({ onPhotoSelect, onReceiptSelect, title }: UnifiedUploadProps): import("react/jsx-runtime").JSX.Element;
export {};
