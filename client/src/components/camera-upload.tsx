import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Image, Upload, X } from "lucide-react";

interface CameraUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  title?: string;
  description?: string;
}

export default function CameraUpload({ onFileSelect, accept = "image/*", title = "Add Photos", description = "Take a photo or choose from library" }: CameraUploadProps) {
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handlePhotoLibrary = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFileSelect(files);
      setShowOptions(false);
    }
  };

  return (
    <div className="space-y-4">
      {!showOptions ? (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <Camera className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
              <Button 
                onClick={() => setShowOptions(true)}
                className="w-full"
              >
                <Camera className="w-4 h-4 mr-2" />
                Add Photos
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Choose Photo Source</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOptions(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={handleCameraCapture}
                className="h-24 flex-col space-y-2 border-gray-200 dark:border-gray-700"
              >
                <Camera className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium">Take Photo</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handlePhotoLibrary}
                className="h-24 flex-col space-y-2 border-gray-200 dark:border-gray-700"
              >
                <Image className="w-8 h-8 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium">Photo Library</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
      />
      
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