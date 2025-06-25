import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Camera, Upload, Receipt, FileText, Image } from "lucide-react";

interface UnifiedUploadProps {
  onPhotoSelect: (files: File[]) => void;
  onReceiptSelect: (files: File[]) => void;
  title?: string;
}

export default function UnifiedUpload({ 
  onPhotoSelect, 
  onReceiptSelect, 
  title = "Upload Files" 
}: UnifiedUploadProps) {
  const [showOptions, setShowOptions] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoLibrary = () => {
    photoInputRef.current?.click();
    setShowOptions(false);
  };

  const handleCamera = () => {
    cameraInputRef.current?.click();
    setShowOptions(false);
  };

  const handleReceipt = () => {
    receiptInputRef.current?.click();
    setShowOptions(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      console.log('Photo files selected:', files);
      onPhotoSelect(files);
      e.target.value = '';
    }
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      console.log('Receipt files selected:', files);
      onReceiptSelect(files);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePhotoChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handlePhotoChange}
      />
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleReceiptChange}
      />

      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Take photos, upload from library, or add receipts
            </p>
            
            <Dialog open={showOptions} onOpenChange={setShowOptions}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-gray-900 dark:text-white">Choose Upload Type</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Button
                    variant="outline"
                    className="h-16 flex flex-col gap-2"
                    onClick={handleCamera}
                  >
                    <Camera className="w-6 h-6" />
                    <span>Take Photo</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-16 flex flex-col gap-2"
                    onClick={handlePhotoLibrary}
                  >
                    <Image className="w-6 h-6" />
                    <span>Photo Library</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-16 flex flex-col gap-2"
                    onClick={handleReceipt}
                  >
                    <Receipt className="w-6 h-6" />
                    <span>Receipt/Document</span>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}