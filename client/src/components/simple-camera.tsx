import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";

interface SimpleCameraProps {
  onFileSelect: (files: File[]) => void;
}

export default function SimpleCamera({ onFileSelect }: SimpleCameraProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      console.log('Files selected:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
      
      // Create preview URLs
      const urls = files.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...urls]);
      setSelectedFiles(prev => [...prev, ...files]);
      
      // Call the parent callback
      onFileSelect(files);
      
      e.target.value = '';
    }
  };

  const handleCameraClick = async () => {
    console.log('Camera button clicked');
    
    // Check if camera input exists
    if (!cameraInputRef.current) {
      console.error('Camera input ref not found');
      return;
    }

    // Check for camera API support
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      console.log('Camera API supported');
      try {
        // Test camera permission
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log('Camera permission granted');
        stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      } catch (error) {
        console.error('Camera permission denied or unavailable:', error);
      }
    } else {
      console.warn('Camera API not supported in this browser');
    }

    console.log('Triggering camera input click');
    cameraInputRef.current.click();
  };

  const handleLibraryClick = () => {
    console.log('Library button clicked');
    if (fileInputRef.current) {
      console.log('Triggering file input');
      fileInputRef.current.click();
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]); // Clean up memory
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setSelectedFiles([]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          onClick={handleCameraClick}
          className="h-16 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Camera className="w-6 h-6 mr-2" />
          Take Photo
        </Button>
        
        <Button
          variant="outline"
          onClick={handleLibraryClick}
          className="h-16 border-gray-300 dark:border-gray-600"
        >
          <Upload className="w-6 h-6 mr-2" />
          Upload from Library
        </Button>
      </div>

      {/* Camera input - rear camera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        style={{ display: 'none' }}
        onClick={() => console.log('Camera input clicked')}
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

      {/* Photo Preview Grid */}
      {previewUrls.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Selected Photos ({selectedFiles.length})</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="text-red-600 hover:text-red-700"
            >
              Clear All
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate">
                  {selectedFiles[index]?.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}