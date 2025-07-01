import React, { useRef, useState } from 'react';
import { Camera, FileText, Loader2, Eye, X } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface ExtractedData {
  vendor: string;
  amount: string;
  items: string[];
  total: string;
}

interface ReceiptUploadProps {
  onUpload: (files: FileList, extractedData?: ExtractedData) => void;
}

export default function ReceiptUpload({ onUpload }: ReceiptUploadProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const extractReceiptData = async (file: File): Promise<ExtractedData> => {
    console.log('Starting OCR processing for:', file.name);
    
    try {
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const lines = data.text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      console.log('OCR extracted lines:', lines);

      // Extract vendor name (usually first few lines)
      const vendorCandidates = lines.slice(0, 5)
        .filter(line => !line.match(/^\d/) && !line.includes('$') && line.length > 2);
      const vendor = vendorCandidates[0] || 'Unknown Vendor';

      // Extract monetary amounts
      const amounts = lines
        .map(line => line.match(/\$?\d+\.?\d{0,2}/g))
        .filter(matches => matches !== null)
        .flat()
        .filter(amount => amount !== null) as string[];

      // Find total (usually largest amount or line with "total")
      const totalLine = lines.find(line => 
        line.toLowerCase().includes('total') || 
        line.toLowerCase().includes('amount')
      );
      
      let total = '0.00';
      if (totalLine) {
        const totalMatch = totalLine.match(/\$?(\d+\.?\d{0,2})/);
        if (totalMatch) total = totalMatch[1];
      } else if (amounts.length > 0) {
        // Use largest amount as total
        const numericAmounts = amounts.map(amt => parseFloat(amt.replace('$', '')));
        total = Math.max(...numericAmounts).toFixed(2);
      }

      // Extract potential items (lines with paint-related keywords or alphanumeric codes)
      const itemKeywords = ['paint', 'brush', 'roller', 'tape', 'primer', 'sandpaper', 'drop', 'cloth'];
      const items = lines.filter(line => {
        const lower = line.toLowerCase();
        return itemKeywords.some(keyword => lower.includes(keyword)) ||
               line.match(/^[A-Z0-9\-\s]{3,20}$/);
      }).slice(0, 5); // Limit to 5 items

      const result = {
        vendor: vendor.substring(0, 50), // Limit vendor name length
        amount: total,
        items: items,
        total: total
      };

      console.log('Extracted receipt data:', result);
      return result;

    } catch (error) {
      console.error('OCR processing failed:', error);
      return {
        vendor: 'OCR Failed',
        amount: '0.00',
        items: [],
        total: '0.00'
      };
    }
  };

  const handleTakePhoto = () => {
    photoInputRef.current?.click();
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setExtractedData(null);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Extract data with OCR for images
    if (file.type.startsWith('image/')) {
      const data = await extractReceiptData(file);
      setExtractedData(data);
    }

    setIsProcessing(false);
  };

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await processFile(file);
      e.target.value = '';
    }
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await processFile(file);
      e.target.value = '';
    }
  };

  const handleUploadWithData = () => {
    if (previewImage && extractedData) {
      // Convert preview back to file for upload
      fetch(previewImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
          const dt = new DataTransfer();
          dt.items.add(file);
          onUpload(dt.files, extractedData);
          
          // Reset state
          setExtractedData(null);
          setPreviewImage(null);
          setShowPreview(false);
        });
    }
  };

  const handleCancel = () => {
    setExtractedData(null);
    setPreviewImage(null);
    setShowPreview(false);
  };

  return (
    <div className="space-y-4">
      {!extractedData && !isProcessing && (
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleTakePhoto}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition-colors flex items-center gap-2"
          >
            <Camera size={16} />
            Take Receipt Photo
          </button>

          <button
            type="button"
            onClick={handleUploadFile}
            className="bg-orange-600 hover:bg-orange-700 text-white rounded px-4 py-2 transition-colors flex items-center gap-2"
          >
            <FileText size={16} />
            Upload Receipt File
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={20} />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Processing Receipt</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">Reading receipt data with OCR...</p>
            </div>
          </div>
        </div>
      )}

      {extractedData && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-medium text-green-900 dark:text-green-100">Receipt Data Extracted</h4>
            <div className="flex gap-2">
              {previewImage && (
                <button
                  onClick={() => setShowPreview(true)}
                  className="text-green-600 hover:text-green-700 p-1"
                  title="View receipt image"
                >
                  <Eye size={16} />
                </button>
              )}
              <button
                onClick={handleCancel}
                className="text-green-600 hover:text-green-700 p-1"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-green-800 dark:text-green-200">Vendor:</span>
              <span className="ml-2 text-green-700 dark:text-green-300">{extractedData.vendor}</span>
            </div>
            <div>
              <span className="font-medium text-green-800 dark:text-green-200">Amount:</span>
              <span className="ml-2 text-green-700 dark:text-green-300">${extractedData.amount}</span>
            </div>
            {extractedData.items.length > 0 && (
              <div>
                <span className="font-medium text-green-800 dark:text-green-200">Items:</span>
                <div className="ml-2 text-green-700 dark:text-green-300">
                  {extractedData.items.slice(0, 3).join(', ')}
                  {extractedData.items.length > 3 && '...'}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleUploadWithData}
              className="bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2 text-sm transition-colors"
            >
              Use This Data
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white rounded px-4 py-2 text-sm transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowPreview(false)}>
          <div className="max-w-3xl max-h-3xl p-4">
            <img 
              src={previewImage} 
              alt="Receipt preview" 
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

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