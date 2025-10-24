import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, DollarSign } from 'lucide-react';
import TaxConfiguration from './TaxConfiguration';

// Paint Brain Colors
const paintBrainColors = {
  purple: '#8B5FBF',
  gray: '#6B7280'
};

interface TaxSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TaxSetupModal: React.FC<TaxSetupModalProps> = ({ isOpen, onClose }) => {
  const [hasSetup, setHasSetup] = useState(false);

  const handleSave = () => {
    // Mark as setup completed
    localStorage.setItem('taxSetupCompleted', 'true');
    setHasSetup(true);
    onClose();
  };

  const handleMaybeLater = () => {
    // Mark as dismissed (don't show again until localStorage is cleared)
    localStorage.setItem('taxSetupCompleted', 'dismissed');
    sessionStorage.setItem('hasShownTaxSetup', 'true');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6 text-purple-400" />
              <DialogTitle className="text-xl">Set up your info now?</DialogTitle>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-muted-foreground">
            This helps auto-calculate taxes on future invoices.
          </p>
          
          <div className="border rounded-lg p-4">
            <TaxConfiguration onSave={handleSave} showSaveButton={false} />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleMaybeLater}
              className="text-white hover:text-white border-purple-500 hover:bg-purple-600"
              style={{ 
                borderColor: paintBrainColors.purple,
                color: 'white',
                backgroundColor: 'transparent'
              }}
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleSave}
              style={{ backgroundColor: paintBrainColors.purple, color: 'white' }}
              className="hover:opacity-90"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaxSetupModal;