import React from 'react';
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
declare const TaxConfiguration: React.FC<TaxConfigurationProps>;
export default TaxConfiguration;
