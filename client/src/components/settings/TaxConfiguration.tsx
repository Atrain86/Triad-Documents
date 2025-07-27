import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Paint Brain Colors
const paintBrainColors = {
  red: '#F44747',
  orange: '#D4A574',
  yellow: '#DCDCAA',
  green: '#6A9955',
  blue: '#569CD6',
  purple: '#8B5FBF'
};

interface TaxConfig {
  country: string;
  gst: number;
  pst: number;
  hst: number;
  salesTax: number;
  vat: number;
  otherTax: number;
}

interface TaxConfigurationProps {
  onSave?: (config: TaxConfig) => void;
  showSaveButton?: boolean;
}

const TaxConfiguration: React.FC<TaxConfigurationProps> = ({ 
  onSave, 
  showSaveButton = true 
}) => {
  const { toast } = useToast();
  
  // Load saved tax configuration from localStorage
  const loadSavedTaxConfig = (): TaxConfig => {
    try {
      const saved = localStorage.getItem('taxConfiguration');
      return saved ? JSON.parse(saved) : {
        country: 'CA',
        gst: 5,
        pst: 0,
        hst: 0,
        salesTax: 0,
        vat: 0,
        otherTax: 0
      };
    } catch {
      return {
        country: 'CA',
        gst: 5,
        pst: 0,
        hst: 0,
        salesTax: 0,
        vat: 0,
        otherTax: 0
      };
    }
  };

  const [taxConfig, setTaxConfig] = useState<TaxConfig>(loadSavedTaxConfig());

  // Save to localStorage whenever config changes
  useEffect(() => {
    localStorage.setItem('taxConfiguration', JSON.stringify(taxConfig));
  }, [taxConfig]);

  const handleCountryChange = (country: string) => {
    let newConfig = { ...taxConfig, country };
    
    // Reset all tax rates when country changes
    newConfig = {
      ...newConfig,
      gst: 0,
      pst: 0,
      hst: 0,
      salesTax: 0,
      vat: 0,
      otherTax: 0
    };

    // Set default rates based on country
    switch (country) {
      case 'CA':
        newConfig.gst = 5;
        break;
      case 'US':
        newConfig.salesTax = 8.5;
        break;
      case 'UK':
        newConfig.vat = 20;
        break;
      default:
        // International - leave at 0
        break;
    }

    setTaxConfig(newConfig);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(taxConfig);
    }
    toast({
      title: "Tax Configuration Saved",
      description: "Your tax settings have been updated successfully.",
    });
  };

  const renderTaxInputs = () => {
    switch (taxConfig.country) {
      case 'CA':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="gst" className="text-[#DCDCAA] font-medium">GST (%)</Label>
              <Input
                id="gst"
                type="number"
                step="0.01"
                value={taxConfig.gst}
                onChange={(e) => setTaxConfig({ ...taxConfig, gst: parseFloat(e.target.value) || 0 })}
                className="mt-2 border-yellow-400/30 bg-yellow-900/10 text-yellow-100 focus:border-yellow-400"
              />
            </div>
            <div>
              <Label htmlFor="pst" className="text-[#DCDCAA] font-medium">PST (%)</Label>
              <Input
                id="pst"
                type="number"
                step="0.01"
                value={taxConfig.pst}
                onChange={(e) => setTaxConfig({ ...taxConfig, pst: parseFloat(e.target.value) || 0 })}
                className="mt-2 border-yellow-400/30 bg-yellow-900/10 text-yellow-100 focus:border-yellow-400"
              />
            </div>
            <div>
              <Label htmlFor="hst" className="text-[#DCDCAA] font-medium">HST (%)</Label>
              <Input
                id="hst"
                type="number"
                step="0.01"
                value={taxConfig.hst}
                onChange={(e) => setTaxConfig({ ...taxConfig, hst: parseFloat(e.target.value) || 0 })}
                className="mt-2 border-yellow-400/30 bg-yellow-900/10 text-yellow-100 focus:border-yellow-400"
              />
            </div>
          </div>
        );
      case 'US':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salesTax" className="text-[#DCDCAA] font-medium">Sales Tax (%)</Label>
              <Input
                id="salesTax"
                type="number"
                step="0.01"
                value={taxConfig.salesTax}
                onChange={(e) => setTaxConfig({ ...taxConfig, salesTax: parseFloat(e.target.value) || 0 })}
                className="mt-2 border-yellow-400/30 bg-yellow-900/10 text-yellow-100 focus:border-yellow-400"
              />
            </div>
            <div>
              <Label htmlFor="otherTax" className="text-[#DCDCAA] font-medium">Other Tax (%)</Label>
              <Input
                id="otherTax"
                type="number"
                step="0.01"
                value={taxConfig.otherTax}
                onChange={(e) => setTaxConfig({ ...taxConfig, otherTax: parseFloat(e.target.value) || 0 })}
                className="mt-2 border-yellow-400/30 bg-yellow-900/10 text-yellow-100 focus:border-yellow-400"
              />
            </div>
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vat" className="text-[#DCDCAA] font-medium">VAT (%)</Label>
              <Input
                id="vat"
                type="number"
                step="0.01"
                value={taxConfig.vat}
                onChange={(e) => setTaxConfig({ ...taxConfig, vat: parseFloat(e.target.value) || 0 })}
                className="mt-2 border-yellow-400/30 bg-yellow-900/10 text-yellow-100 focus:border-yellow-400"
              />
            </div>
            <div>
              <Label htmlFor="otherTax" className="text-[#DCDCAA] font-medium">Other Tax (%)</Label>
              <Input
                id="otherTax"
                type="number"
                step="0.01"
                value={taxConfig.otherTax}
                onChange={(e) => setTaxConfig({ ...taxConfig, otherTax: parseFloat(e.target.value) || 0 })}
                className="mt-2 border-yellow-400/30 bg-yellow-900/10 text-yellow-100 focus:border-yellow-400"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Tax Configuration Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-yellow-400">Tax Configuration</h2>
        <p className="text-[#DCDCAA] text-sm">
          Configure tax rates for invoices and estimates across different regions.
          Settings are saved automatically and applied to all future documents.
        </p>
      </div>

      {/* Tax Settings Container */}
      <div className="relative p-6 rounded-xl border-2 border-yellow-400/50 bg-gradient-to-r from-yellow-900/10 to-yellow-800/5 backdrop-blur-sm">
        
        <div className="space-y-6">
          {/* Country Selection */}
          <div>
            <Label htmlFor="country" className="text-lg font-semibold text-yellow-300">Country/Region</Label>
            <Select value={taxConfig.country} onValueChange={handleCountryChange}>
              <SelectTrigger className="mt-2 border-yellow-400/30 bg-yellow-900/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-yellow-400/30">
                <SelectItem value="CA">Canada</SelectItem>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="UK">United Kingdom</SelectItem>
                <SelectItem value="OTHER">Other/International</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tax Input Fields */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-yellow-300">Tax Rates Configuration</h3>
            {renderTaxInputs()}
          </div>

          {/* Tax Summary */}
          <div className="pt-4 border-t border-yellow-400/30">
            <div className="bg-yellow-900/20 border border-yellow-400/30 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-yellow-300 mb-2">Tax Summary</h4>
              <p className="text-xl font-bold text-yellow-400 mb-2">
                Total Tax Rate: {(
                  taxConfig.gst + 
                  taxConfig.pst + 
                  taxConfig.hst + 
                  taxConfig.salesTax + 
                  taxConfig.vat + 
                  taxConfig.otherTax
                ).toFixed(2)}%
              </p>
              <p className="text-sm text-[#DCDCAA]">
                This tax configuration will be automatically applied to all future invoices and estimates.
              </p>
            </div>
          </div>

          {showSaveButton && (
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSave}
                className="bg-[#8B5FBF] hover:bg-[#7B4FAF] text-white border-[#8B5FBF] flex items-center gap-2"
              >
                Save Tax Configuration
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaxConfiguration;