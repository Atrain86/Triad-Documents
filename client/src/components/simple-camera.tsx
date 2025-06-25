import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload } from "lucide-react";

interface SimpleCameraProps {
  onFileSelect: (files: File[]) => void;
}

export default function SimpleCamera({ onFileSelect }: SimpleCameraProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFileSelect(files);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          onClick={() => cameraInputRef.current?.click()}
          className="h-16 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Camera className="w-6 h-6 mr-2" />
          Take Photo
        </Button>
        
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="h-16 border-gray-300 dark:border-gray-600"
        >
          <Upload className="w-6 h-6 mr-2" />
          Upload from Library
        </Button>
      </div>

      {/* Camera input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}