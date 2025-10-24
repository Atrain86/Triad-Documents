interface FileUploadProps {
    accept?: string;
    multiple?: boolean;
    onFileSelect: (files: File[]) => void;
    children?: React.ReactNode;
}
export default function FileUpload({ accept, multiple, onFileSelect, children }: FileUploadProps): import("react/jsx-runtime").JSX.Element;
export {};
