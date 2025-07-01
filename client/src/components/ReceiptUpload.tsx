import React, { useRef } from 'react';

interface ReceiptUploadProps {
  onUpload: (files: FileList) => void;
}

export default function ReceiptUpload({ onUpload }: ReceiptUploadProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTakePhoto = () => {
    photoInputRef.current?.click();
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const onPhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      e.target.value = '';
    }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="flex gap-4">
      <button
        type="button"
        onClick={handleTakePhoto}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition-colors"
      >
        Take Receipt Photo
      </button>

      <button
        type="button"
        onClick={handleUploadFile}
        className="bg-orange-600 hover:bg-orange-700 text-white rounded px-4 py-2 transition-colors"
      >
        Upload Receipt File
      </button>

      {/* Hidden inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPhotoSelected}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onFileSelected}
        className="hidden"
      />
    </div>
  );
}