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
              <Label htmlFor="gst">GST (%)</Label>
              <Input
                id="gst"
                type="number"
                step="0.01"
                value={taxConfig.gst}
                onChange={(e) => setTaxConfig({ ...taxConfig, gst: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pst">PST (%)</Label>
              <Input
                id="pst"
                type="number"
                step="0.01"
                value={taxConfig.pst}
                onChange={(e) => setTaxConfig({ ...taxConfig, pst: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="hst">HST (%)</Label>
              <Input
                id="hst"
                type="number"
                step="0.01"
                value={taxConfig.hst}
                onChange={(e) => setTaxConfig({ ...taxConfig, hst: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          </div>
        );
      case 'US':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salesTax">Sales Tax (%)</Label>
              <Input
                id="salesTax"
                type="number"
                step="0.01"
                value={taxConfig.salesTax}
                onChange={(e) => setTaxConfig({ ...taxConfig, salesTax: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="otherTax">Other Tax (%)</Label>
              <Input
                id="otherTax"
                type="number"
                step="0.01"
                value={taxConfig.otherTax}
                onChange={(e) => setTaxConfig({ ...taxConfig, otherTax: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vat">VAT (%)</Label>
              <Input
                id="vat"
                type="number"
                step="0.01"
                value={taxConfig.vat}
                onChange={(e) => setTaxConfig({ ...taxConfig, vat: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="otherTax">Other Tax (%)</Label>
              <Input
                id="otherTax"
                type="number"
                step="0.01"
                value={taxConfig.otherTax}
                onChange={(e) => setTaxConfig({ ...taxConfig, otherTax: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="country">Country/Region</Label>
          <Select value={taxConfig.country} onValueChange={handleCountryChange}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CA">Canada</SelectItem>
              <SelectItem value="US">United States</SelectItem>
              <SelectItem value="UK">United Kingdom</SelectItem>
              <SelectItem value="OTHER">Other/International</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {renderTaxInputs()}

        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Total Tax Rate: {(
                taxConfig.gst + 
                taxConfig.pst + 
                taxConfig.hst + 
                taxConfig.salesTax + 
                taxConfig.vat + 
                taxConfig.otherTax
              ).toFixed(2)}%</strong>
            </p>
            <p>
              This tax configuration will be automatically applied to all future invoices and estimates.
            </p>
          </div>
        </div>

        {showSaveButton && (
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              style={{ backgroundColor: paintBrainColors.purple, color: 'white' }}
              className="hover:opacity-90"
            >
              Save Tax Configuration
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxConfiguration;