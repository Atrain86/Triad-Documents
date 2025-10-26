import React, { useState } from 'react';
import { FileText, Calculator } from 'lucide-react';
import { LucideIconWrapper } from './LucideIconWrapper';

type ToggleState = 'invoice' | 'estimate';

interface InvoiceEstimateToggleProps {
  onToggle?: (state: ToggleState) => void;
}

const InvoiceEstimateToggle: React.FC<InvoiceEstimateToggleProps> = ({ onToggle }) => {
  const [activeState, setActiveState] = useState<ToggleState>('invoice');

  const isInvoice = activeState === 'invoice';

  const handleToggle = () => {
    const newState: ToggleState = isInvoice ? 'estimate' : 'invoice';
    setActiveState(newState);
    onToggle?.(newState);
  };

  const borderColor = isInvoice ? '#6B4C9A' : '#EF6C30';
  const generateButtonColor = isInvoice ? 'bg-[#6B4C9A]' : 'bg-[#EF6C30]';

  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-md mx-auto">
      {/* Toggle Container */}
      <div
        onClick={handleToggle}
        role="switch"
        aria-checked={isInvoice}
        className={`relative flex items-center w-full h-14 rounded-full cursor-pointer overflow-hidden transition-all duration-300`}
        style={{ 
          border: `3px solid ${borderColor}`,
          backgroundColor: '#2A2A2A'
        }}
      >
        {/* Active background - left side for invoice */}
        {isInvoice && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-1/2 bg-[#6B4C9A] rounded-l-full"
          />
        )}
        
        {/* Active background - right side for estimate */}
        {!isInvoice && (
          <div 
            className="absolute right-0 top-0 bottom-0 w-1/2 bg-[#EF6C30] rounded-r-full"
          />
        )}

        {/* Invoice Section */}
        <div className="flex items-center justify-center w-1/2 z-10">
          <LucideIconWrapper 
            icon={FileText} 
            size={20} 
            strokeWidth={2} 
            className={`mr-2 ${isInvoice ? 'text-white' : 'text-gray-500'}`} 
          />
          <span className={`font-medium ${isInvoice ? 'text-white' : 'text-gray-500'}`}>
            Invoice
          </span>
        </div>

        {/* Estimate Section */}
        <div className="flex items-center justify-center w-1/2 z-10">
          <LucideIconWrapper 
            icon={Calculator} 
            size={20} 
            strokeWidth={2} 
            className={`mr-2 ${!isInvoice ? 'text-white' : 'text-gray-500'}`} 
          />
          <span className={`font-medium ${!isInvoice ? 'text-white' : 'text-gray-500'}`}>
            Estimate
          </span>
        </div>
      </div>

      {/* Generate Button */}
      <button 
        className={`${generateButtonColor} text-white px-10 py-3 rounded-xl font-medium transition-all duration-300 hover:opacity-90`}
        aria-label="Generate"
      >
        Generate
      </button>
    </div>
  );
};

export default InvoiceEstimateToggle;
