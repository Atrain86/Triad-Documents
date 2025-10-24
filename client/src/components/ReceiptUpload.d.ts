interface ExtractedData {
    vendor: string;
    amount: string;
    items: string[];
    total: string;
    confidence: number;
    method: string;
}
interface ReceiptUploadProps {
    onUpload: (files: FileList, extractedData?: ExtractedData) => void;
}
export default function ReceiptUpload({ onUpload }: ReceiptUploadProps): import("react/jsx-runtime").JSX.Element;
export {};
