import React, { useState, useRef } from 'react';
import { Camera, FileText, Loader2, Brain, Eye, X, Check, DollarSign } from 'lucide-react';
// Tesseract removed - using OpenAI Vision API only
import { processReceiptText, ProcessedReceiptData } from '../utils/receiptProcessing';

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

export default function ReceiptUpload({ onUpload }: ReceiptUploadProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedReceiptData | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [manuallySelectedAmount, setManuallySelectedAmount] = useState<number | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const handlePhotoClick = () => {
    photoInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setExtractedData(null);
    setOcrText('');
    setOcrError(null);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Clear input
    event.target.value = '';
  };

  const processOCRResult = async (text: string) => {
    try {
      console.log('Processing OCR result with enhanced logic...');
      
      // Try GPT enhancement first
      let gptEnhancement = null;
      try {
        const response = await fetch('/api/receipts/ocr-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (response.ok) {
          gptEnhancement = await response.json();
          console.log('GPT enhancement successful:', gptEnhancement);
        }
      } catch (error) {
        console.warn('GPT enhancement failed, proceeding with Tesseract only:', error);
      }

      // Process with enhanced logic
      const processed = processReceiptText(text, gptEnhancement);
      setProcessedData(processed);
      
      // Convert to legacy format for compatibility
      const finalAmount = processed.selectedAmount || (processed.amounts[0]?.value) || 0;
      
      setExtractedData({
        vendor: processed.vendor,
        amount: finalAmount.toString(),
        items: processed.items,
        total: finalAmount.toString(),
        confidence: processed.confidence,
        method: processed.method
      });
      
    } catch (error) {
      console.error('OCR processing failed:', error);
      
      // Ultimate fallback
      const lines = text.split('\n').filter(line => line.trim());
      setExtractedData({
        vendor: lines[0] || selectedFile?.name.split('.')[0] || 'Unknown Vendor',
        amount: '0',
        items: lines.slice(1, 3),
        total: '0',
        confidence: 0.1,
        method: 'fallback'
      });
    }
  };

  const extractTextWithVision = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setOcrError(null);
    
    try {
      console.log('Starting Vision API processing...');
      console.log('File details:', {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size
      });

      // Check if file is valid image
      if (!selectedFile.type.startsWith('image/') && !selectedFile.name.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)) {
        throw new Error('Selected file is not a valid image format');
      }

      // Create FormData for server upload
      const formData = new FormData();
      formData.append('receipt', selectedFile);

      console.log('Uploading to Vision API endpoint...');
      
      const response = await fetch('/api/receipts/ocr', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Vision API result:', result);

      if (result.success && result.data) {
        // Convert server response to component format
        setExtractedData({
          vendor: result.data.vendor,
          amount: result.data.amount.toString(),
          items: result.data.items || [],
          total: result.data.amount.toString(),
          confidence: result.data.confidence || 0.8,
          method: result.method || 'openai-vision'
        });

        // Set OCR text for display (if available)
        setOcrText(`Processed with ${result.method}\nVendor: ${result.data.vendor}\nAmount: $${result.data.amount}`);
      } else {
        throw new Error(result.error || 'Failed to process receipt');
      }
      
    } catch (error) {
      console.error('Vision API processing failed:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to process image';
      setOcrError(errorMessage);
      
      // Fallback to manual entry option
      setExtractedData({
        vendor: selectedFile.name.split('.')[0].replace(/[_-]/g, ' '),
        amount: '0',
        items: ['Manual entry required - Vision API failed'],
        total: '0',
        confidence: 0.1,
        method: 'manual-fallback'
      });
    }
    
    setIsProcessing(false);
  };

  const handleAmountSelection = (amount: number) => {
    setManuallySelectedAmount(amount);
    
    if (extractedData) {
      setExtractedData({
        ...extractedData,
        amount: amount.toString(),
        total: amount.toString()
      });
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !extractedData) return;

    // Create FileList-like object
    const dt = new DataTransfer();
    dt.items.add(selectedFile);
    const fileList = dt.files;

    onUpload(fileList, extractedData);
    
    // Reset state
    setSelectedFile(null);
    setExtractedData(null);
    setOcrText('');
    setPreviewImage(null);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setProcessedData(null);
    setOcrText('');
    setPreviewImage(null);
    setManuallySelectedAmount(null);
    setOcrError(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

      {/* File Selected */}
      {selectedFile && !extractedData && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-blue-600" />
              <div>
                <p className="text-blue-800 dark:text-blue-200 font-medium">
                  {selectedFile.name}
                </p>
                <p className="text-blue-600 dark:text-blue-400 text-sm">
                  Ready for Vision API processing
                </p>
              </div>
            </div>
            <button
              onClick={extractTextWithVision}
              disabled={isProcessing}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {isProcessing ? 'Processing...' : 'Extract Data'}
            </button>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Brain size={20} className="text-yellow-600 animate-pulse" />
            <div>
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                Processing with OpenAI Vision API
              </p>
              <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                Analyzing receipt image and extracting data...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {ocrError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <X size={20} className="text-red-600" />
            <div>
              <p className="text-red-800 dark:text-red-200 font-medium">
                Image Processing Failed
              </p>
              <p className="text-red-600 dark:text-red-400 text-sm">
                {ocrError}
              </p>
              <p className="text-red-500 dark:text-red-400 text-xs mt-2">
                💡 Try selecting a different image or use manual entry below
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Data Preview */}
      {extractedData && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-green-600" />
            <span className="text-green-800 dark:text-green-200 font-medium text-sm">
              Data Extracted ({extractedData.method}) - Confidence: {Math.round((extractedData.confidence || 0) * 100)}%
            </span>
          </div>
          
          <div className="text-sm space-y-2 mb-4">
            <p><strong>Vendor:</strong> {extractedData.vendor}</p>
            <p><strong>Amount:</strong> ${extractedData.amount}</p>
            {extractedData.items && extractedData.items.length > 0 && (
              <p><strong>Items:</strong> {extractedData.items.join(', ')}</p>
            )}
          </div>

          {/* Manual Amount Selection for Multiple Amounts */}
          {processedData?.requiresManualSelection && processedData.amounts.length > 1 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={16} className="text-amber-600" />
                <span className="text-amber-800 dark:text-amber-200 font-medium text-sm">
                  Multiple amounts detected - please select the correct total:
                </span>
              </div>
              
              <div className="space-y-2">
                {processedData.amounts.map((amount, index) => (
                  <label key={index} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="amount-selection"
                      value={amount.value}
                      checked={manuallySelectedAmount === amount.value || 
                               (!manuallySelectedAmount && parseFloat(extractedData.amount) === amount.value)}
                      onChange={() => handleAmountSelection(amount.value)}
                      className="text-amber-600"
                    />
                    <span className="text-sm font-mono">
                      ${amount.value.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500">
                      (found as "{amount.original}")
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Raw OCR Text (collapsible) */}
          {ocrText && (
            <details className="mb-4">
              <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                View Extraction Details
              </summary>
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2 whitespace-pre-wrap">
                {ocrText}
              </pre>
            </details>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Upload with This Data
            </button>
            <button
              onClick={resetUpload}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp,.heic,.heif"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}