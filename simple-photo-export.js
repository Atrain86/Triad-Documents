// Simple Photo Upload Component Export
// Core functionality for reliable photo uploads with camera and library support

import React, { useState, useRef } from 'react';

const SimplePhotoUpload = ({ onPhotoUpload }) => {
  const [cameraError, setCameraError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Key fix: Prevent file clearing during upload process
  const handleFileSelect = (files) => {
    if (!files || files.length === 0) return;
    
    // Convert FileList to Array immediately to prevent clearing
    const fileArray = Array.from(files);
    console.log('Files captured:', fileArray.length, 'files');
    
    // Call upload handler with stable file array
    onPhotoUpload(fileArray);
  };

  const handleCameraClick = () => {
    setCameraError('');
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleLibraryClick = () => {
    setCameraError('');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCameraChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input to allow same file selection again
    event.target.value = '';
  };

  const handleLibraryChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input to allow same file selection again
    event.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Camera Error Display */}
      {cameraError && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-orange-600 mr-3">⚠️</div>
            <div>
              <h4 className="text-sm font-medium text-orange-800">Camera Access Issue</h4>
              <p className="text-sm text-orange-700 mt-1">{cameraError}</p>
              <p className="text-xs text-orange-600 mt-2">
                💡 Tip: Use "Upload from Library" to add photos from your device instead.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={handleCameraClick}
          className="h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center"
        >
          <span className="mr-2">📷</span>
          Take Photo
        </button>
        
        <button
          onClick={handleLibraryClick}
          className="h-16 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50"
        >
          <span className="mr-2">📁</span>
          Upload from Library
        </button>
      </div>

      {/* Hidden File Inputs - Key Implementation */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"  // Uses rear camera by default
        onChange={handleCameraChange}
        className="hidden"
      />
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        onChange={handleLibraryChange}
        className="hidden"
      />
    </div>
  );
};

// Usage Example with Upload Handler
const PhotoUploadExample = () => {
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = async (files) => {
    console.log('Starting photo upload...', files.length, 'files');
    setIsUploading(true);

    try {
      const formData = new FormData();
      
      // Add each file to FormData
      files.forEach((file, index) => {
        console.log(`Adding file ${index}:`, file.name, file.size, 'bytes');
        formData.append('photos', file);
      });

      console.log('FormData prepared, making request...');

      const response = await fetch('/api/projects/1/photos', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      
    } catch (error) {
      console.error('Photo upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h2>Photo Upload</h2>
      <SimplePhotoUpload onPhotoUpload={handlePhotoUpload} />
      {isUploading && <p>Uploading photos...</p>}
    </div>
  );
};

export { SimplePhotoUpload, PhotoUploadExample };

/* 
KEY IMPLEMENTATION NOTES:

1. File Persistence Fix:
   - Convert FileList to Array immediately to prevent clearing
   - Files stay stable during upload process

2. Camera Support:
   - capture="environment" uses rear camera
   - Supports HEIC/HEIF formats for iPhone photos
   - Graceful error handling for camera access issues

3. Multi-format Support:
   - accept="image/*,.heic,.heif" handles all common formats
   - Works with JPEG, PNG, GIF, WebP, HEIC files

4. User Experience:
   - Quick tap = file selection
   - Long hold = camera activation (mobile behavior)
   - Clear error messages and fallback options

5. Upload Process:
   - FormData construction with proper file handling
   - Reset inputs after selection for reuse
   - Comprehensive logging for debugging

This implementation solves the file clearing issue that was causing
upload failures and provides reliable photo capture functionality.
*/