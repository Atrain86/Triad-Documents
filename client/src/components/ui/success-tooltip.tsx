import React, { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessTooltipProps {
  isVisible: boolean;
  message: string;
  onClose: () => void;
}

export default function SuccessTooltip({ isVisible, message, onClose }: SuccessTooltipProps) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldShow(true);
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShouldShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!shouldShow) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-green-900 border border-green-700 rounded-lg shadow-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-sm text-white">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-green-400 hover:text-white transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}