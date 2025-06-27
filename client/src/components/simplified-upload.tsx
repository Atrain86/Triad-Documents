import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload } from "lucide-react";

interface SimplifiedUploadProps {
  onFileSelect: (files: File[]) => void;
}

export default function SimplifiedUpload({ onFileSelect }: SimplifiedUploadProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Key fix: Prevent file clearing during upload process
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Convert FileList to Array immediately to prevent clearing
    const fileArray = Array.from(files);
    console.log('Files captured:', fileArray.length, 'files');
    
    // Call upload handler with stable file array
    onFileSelect(fileArray);
  };

  const handlePhotoLibraryClick = () => {
    if (photoInputRef.current) {
      photoInputRef.current.click();
    }
  };

  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input to allow same file selection again
    event.target.value = '';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input to allow same file selection again
    event.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Simplified Upload Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          onClick={handlePhotoLibraryClick}
          className="h-16 text-white font-medium"
          style={{ backgroundColor: '#EA580C', borderColor: '#EA580C' }}
        >
          <Camera className="w-6 h-6 mr-2" />
          Photos
        </Button>
        
        <Button
          onClick={handleFileUploadClick}
          className="h-16 text-white font-medium"
          style={{ backgroundColor: '#1E40AF', borderColor: '#1E40AF' }}
        >
          <Upload className="w-6 h-6 mr-2" />
          Files
        </Button>
      </div>

      {/* Photo Library Input - Direct to photo library */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        onChange={handlePhotoChange}
        className="hidden"
      />
      
      {/* File Upload Input - For all file types */}
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}