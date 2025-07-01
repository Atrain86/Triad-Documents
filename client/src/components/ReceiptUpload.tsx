import React, { useRef, useState } from 'react';
import { Camera, FileText, Loader2, Eye, X, Brain } from 'lucide-react';

interface ExtractedData {
  vendor: string;
  amount: string;
  items: string[];
  total: string;
  confidence?: number;
  method?: string;
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
    console.log('Starting OpenAI OCR processing for:', file.name);
    
    try {
      // Create FormData and send to OpenAI OCR endpoint
      const formData = new FormData();
      formData.append('receipt', file);

      const response = await fetch('/api/receipts/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR processing failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('OpenAI OCR result:', result);

      if (!result.success) {
        throw new Error(result.error || 'OCR processing failed');
      }

      const { data: ocrData } = result;

      return {
        vendor: ocrData.vendor || 'Unknown Vendor',
        amount: ocrData.amount ? ocrData.amount.toString() : '0',
        items: ocrData.items || [],
        total: ocrData.amount ? ocrData.amount.toString() : '0',
        confidence: ocrData.confidence || 0,
        method: result.method || 'openai'
      };

    } catch (error) {
      console.error('OpenAI OCR processing failed:', error);
      return {
        vendor: 'OCR Failed',
        amount: '0.00',
        items: [],
        total: '0.00',
        confidence: 0,
        method: 'error'
      };
    }
  };

  const handlePhotoClick = () => {
    photoInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Handle multiple files by processing the first one for preview/OCR
    // but upload all files
    const firstFile = files[0];
    const isImage = firstFile.type.startsWith('image/');
    
    setIsProcessing(true);
    setExtractedData(null);
    
    // Create preview for images
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(firstFile);

      // Try OCR extraction for receipt data
      try {
        const data = await extractReceiptData(firstFile);
        setExtractedData(data);
      } catch (error) {
        console.error('OCR extraction failed:', error);
        // Set minimal data for photos without OCR
        setExtractedData({
          vendor: 'Photo',
          amount: '0',
          items: [],
          total: '0',
          confidence: 0,
          method: 'photo'
        });
      }
    } else {
      // For non-image files, set basic metadata
      setExtractedData({
        vendor: firstFile.name.split('.')[0],
        amount: '0',
        items: [],
        total: '0',
        confidence: 0,
        method: 'file'
      });
    }

    setIsProcessing(false);
    
    // Reset file inputs
    event.target.value = '';
  };

  const handleUpload = () => {
    const input = extractedData?.method === 'openai' ? photoInputRef.current : fileInputRef.current;
    if (input?.files && previewImage && extractedData) {
      // Show preview for confirmation
      setShowPreview(true);
    } else if (input?.files) {
      onUpload(input.files, extractedData || undefined);
    }
  };

  const confirmUpload = () => {
    const input = extractedData?.method === 'openai' ? photoInputRef.current : fileInputRef.current;
    if (input?.files) {
      onUpload(input.files, extractedData || undefined);
      setExtractedData(null);
      setPreviewImage(null);
      setShowPreview(false);
    }
  };

  const cancelUpload = () => {
    setExtractedData(null);
    setPreviewImage(null);
    setShowPreview(false);
  };

  if (showPreview && previewImage && extractedData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Confirm Receipt Data</h3>
              <button
                onClick={cancelUpload}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {/* Preview Image */}
            <div className="mb-4">
              <img
                src={previewImage}
                alt="Receipt preview"
                className="max-h-64 mx-auto rounded border"
              />
            </div>

            {/* Extracted Data */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Brain size={16} className="text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  OpenAI Extracted Data (Confidence: {Math.round((extractedData.confidence || 0) * 100)}%)
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Vendor</label>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                  {extractedData.vendor}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                  ${extractedData.amount}
                </div>
              </div>
              
              {extractedData.items && extractedData.items.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">Items</label>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                    {extractedData.items.join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={confirmUpload}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                Upload with This Data
              </button>
              <button
                onClick={cancelUpload}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <button
            onClick={handlePhotoClick}
            disabled={isProcessing}
            className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-lg transition-all duration-200 flex flex-col items-center gap-2"
          >
            {isProcessing ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Camera size={24} />
            )}
            <span className="font-medium text-sm">Photos</span>
          </button>
          <p className="text-xs text-gray-500 mt-2">Photo Library</p>
        </div>

        <div className="text-center">
          <button
            onClick={handleFileClick}
            disabled={isProcessing}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-all duration-200 flex flex-col items-center gap-2"
          >
            <FileText size={24} />
            <span className="font-medium text-sm">Files</span>
          </button>
          <p className="text-xs text-gray-500 mt-2">Documents</p>
        </div>
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Brain size={20} className="text-blue-600 animate-pulse" />
            <div>
              <p className="text-blue-800 dark:text-blue-200 font-medium">
                Processing with OpenAI Vision
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-sm">
                Extracting vendor, amount, and items from receipt...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Data Preview */}
      {extractedData && !showPreview && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={16} className="text-green-600" />
            <span className="text-green-800 dark:text-green-200 font-medium text-sm">
              Data Extracted (Confidence: {Math.round((extractedData.confidence || 0) * 100)}%)
            </span>
          </div>
          <div className="text-sm space-y-1">
            <p><strong>Vendor:</strong> {extractedData.vendor}</p>
            <p><strong>Amount:</strong> ${extractedData.amount}</p>
            {extractedData.items && extractedData.items.length > 0 && (
              <p><strong>Items:</strong> {extractedData.items.join(', ')}</p>
            )}
          </div>
          <button
            onClick={handleUpload}
            className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            <Eye size={16} className="inline mr-2" />
            Review & Upload
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic,.heif"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}