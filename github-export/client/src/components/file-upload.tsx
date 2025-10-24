import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CloudUpload, X } from "lucide-react";

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  onFileSelect: (files: File[]) => void;
  children?: React.ReactNode;
}

export default function FileUpload({ accept, multiple = false, onFileSelect, children }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      onFileSelect(files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      onFileSelect(files);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
        dragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      
      {children || (
        <>
          <CloudUpload className="mx-auto text-3xl text-gray-400 mb-4" />
          <p className="text-sm font-medium text-gray-900">Upload Files</p>
          <p className="text-xs text-gray-500">Click or drag files here</p>
        </>
      )}
    </div>
  );
}
