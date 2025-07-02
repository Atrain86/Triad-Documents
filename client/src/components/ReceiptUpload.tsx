import React, { useState, useRef } from 'react';
import { Camera, FileText, Loader2, Brain, Eye, X, Check } from 'lucide-react';
import Tesseract from 'tesseract.js';

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
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  const extractTextWithTesseract = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    
    try {
      console.log('Starting Tesseract OCR processing...');
      const { data: { text } } = await Tesseract.recognize(selectedFile, 'eng', {
        logger: m => console.log(m)
      });
      
      setOcrText(text);
      console.log('Tesseract OCR result:', text);

      // Try to enhance with GPT-4 if available
      await enhanceWithGPT(text);
      
    } catch (error) {
      console.error('Tesseract OCR failed:', error);
      // Fallback to basic file info
      setExtractedData({
        vendor: selectedFile.name.split('.')[0],
        amount: '0',
        items: [],
        total: '0',
        confidence: 0.1,
        method: 'fallback'
      });
    }
    
    setIsProcessing(false);
  };

  const enhanceWithGPT = async (text: string) => {
    try {
      console.log('Attempting GPT-4 enhancement...');
      
      const response = await fetch('/api/receipts/ocr-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('GPT enhancement successful:', result);
        
        setExtractedData({
          vendor: result.vendor || 'Unknown Vendor',
          amount: result.amount?.toString() || '0',
          items: result.items || [],
          total: result.amount?.toString() || '0',
          confidence: 0.8,
          method: 'tesseract+gpt'
        });
      } else {
        throw new Error('GPT enhancement failed');
      }
    } catch (error) {
      console.warn('GPT enhancement failed, using raw OCR:', error);
      
      // Parse basic info from OCR text
      const lines = text.split('\n').filter(line => line.trim());
      const amountMatch = text.match(/\$?(\d+\.?\d*)/);
      const amount = amountMatch ? amountMatch[1] : '0';
      
      setExtractedData({
        vendor: lines[0] || 'Unknown Vendor',
        amount,
        items: lines.slice(1, 4), // Take a few lines as items
        total: amount,
        confidence: 0.6,
        method: 'tesseract'
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
    setOcrText('');
    setPreviewImage(null);
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
                  Ready for OCR processing
                </p>
              </div>
            </div>
            <button
              onClick={extractTextWithTesseract}
              disabled={isProcessing}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
              {isProcessing ? 'Processing...' : 'Extract Text'}
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
                Processing with Tesseract OCR
              </p>
              <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                Extracting text, then enhancing with AI...
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

          {/* Raw OCR Text (collapsible) */}
          {ocrText && (
            <details className="mb-4">
              <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                View Raw OCR Text
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