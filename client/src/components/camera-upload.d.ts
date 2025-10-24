interface CameraUploadProps {
    onFileSelect: (files: File[]) => void;
    accept?: string;
    title?: string;
    description?: string;
}
export default function CameraUpload({ onFileSelect, accept, title, description }: CameraUploadProps): import("react/jsx-runtime").JSX.Element;
export {};
