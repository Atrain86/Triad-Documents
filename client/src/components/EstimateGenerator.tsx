import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Download, Mail, Plus, Trash2, Calendar, ChevronDown, ChevronLeft } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { apiRequest } from '@/lib/queryClient';
import type { Project } from '@shared/schema';
import PaintBrainCalendar from '@/components/PaintBrainCalendar';

interface EstimateGeneratorProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export default function EstimateGenerator({ project, isOpen, onClose }: EstimateGeneratorProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get documents logo (unified for estimates and invoices)
  const { data: documentsLogo } = useQuery({
    queryKey: [`/api/users/1/logos/documents`],
    select: (data: any) => data?.logo || null
  });

  // Fallback to regular logo if no documents-specific logo is set
  const { data: fallbackLogo } = useQuery({
    queryKey: [`/api/users/1/logo`],
    select: (data: any) => data?.logo || null,
    enabled: !documentsLogo
  });

  const currentLogo = documentsLogo || fallbackLogo;

  // Logo visibility settings
  const [logoVisibility, setLogoVisibility] = useState(() => {
    const saved = localStorage.getItem('logoVisibility');
    return saved ? JSON.parse(saved) : {
      homepage: true,
      estimates: true,
      emails: true
    };
  });

  // Load saved form data from localStorage
  const loadSavedData = () => {
    try {
      const saved = localStorage.getItem('estimateFormData');
      const data = saved ? JSON.parse(saved) : {};
      // Always exclude the date from saved data to ensure current date is used
      delete data.estimateDate;
      return data;
    } catch {
      return {};
    }
  };

  // Initialize form data when dialog opens (run only once per open)
  useEffect(() => {
    if (isOpen && !isInitialized) {
      // Keep localStorage for persistence - don't clear it
      setIsInitialized(true);
    } else if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen, isInitialized]);

  // Listen for logo visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const saved = localStorage.getItem('logoVisibility');
      if (saved) {
        setLogoVisibility(JSON.parse(saved));
      }
    };

    window.addEventListener('storage', handleVisibilityChange);
    return () => window.removeEventListener('storage', handleVisibilityChange);
  }, []);

  const savedData = loadSavedData();

  const [projectTitle, setProjectTitle] = useState(savedData.projectTitle || '');
  const [estimateDate, setEstimateDate] = useState(() => {
    // Always use current date as default, using local timezone
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Collapsible sections state - start collapsed for cleaner look
  const [expandedSections, setExpandedSections] = useState({
    estimateDetails: false,
    servicesLabor: false,
    paintMaterials: false,
    additionalLabor: false,
    additionalServices: false,
    travel: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Work stages state with localStorage persistence
  const [workStages, setWorkStages] = useState(savedData.workStages || [
    { name: 'Prep', hours: '', rate: 60 },
    { name: 'Priming', hours: '', rate: 60 },
    { name: 'Painting', hours: '', rate: 60 },
  ]);

  // Paint costs state
  const [paintCosts, setPaintCosts] = useState(savedData.paintCosts || {
    pricePerGallon: '',
    gallons: '',
    coats: '2'
  });

  // Additional services - Always show 3 default services
  const getDefaultAdditionalServices = () => [
    { name: 'Power Washing', hours: '', rate: 60 },
    { name: 'Drywall Repair', hours: '', rate: 60 },
    { name: 'Wood Reconditioning', hours: '', rate: 60 }
  ];

  const [additionalServices, setAdditionalServices] = useState(() => {
    // ALWAYS ensure we have exactly the 3 default services first
    const defaults = getDefaultAdditionalServices();
    
    // For now, let's always reset to defaults to fix the issue
    // TODO: Later we can add logic to preserve user-added services beyond the defaults
    return defaults;
  });

  // Additional labor (crew members) - This was missing!
  const [additionalLabor, setAdditionalLabor] = useState(savedData.additionalLabor || [
    { name: '', hours: '', rate: '' }
  ]);

  // Custom supplies state
  const [customSupplies, setCustomSupplies] = useState(savedData.customSupplies || [
    { name: '', quantity: '', pricePerUnit: '' }
  ]);

  // Travel costs state
  const [travelCosts, setTravelCosts] = useState(savedData.travelCosts || {
    distance: '',
    trips: '',
    ratePerKm: ''
  });

  // Toggle state for action buttons - default to email (left side)
  const [actionMode, setActionMode] = useState<'email' | 'download'>('email');

  // Material markup state
  const [materialMarkupEnabled, setMaterialMarkupEnabled] = useState(savedData.materialMarkupEnabled || false);
  const [materialMarkupPercentage, setMaterialMarkupPercentage] = useState(savedData.materialMarkupPercentage || '');

  // Remove collapsible sections entirely to eliminate layout shifts
  // All sections will be permanently visible for stable UI

  // Save form data to localStorage whenever state changes (excluding date)
  useEffect(() => {
    const formData = {
      projectTitle,
      // Exclude estimateDate from saving to ensure current date is always used
      workStages,
      paintCosts,
      customSupplies,
      additionalServices,
      additionalLabor,
      travelCosts,
      materialMarkupEnabled,
      materialMarkupPercentage
    };
    localStorage.setItem('estimateFormData', JSON.stringify(formData));
  }, [projectTitle, workStages, paintCosts, customSupplies, additionalServices, additionalLabor, travelCosts, materialMarkupEnabled, materialMarkupPercentage]);

  // Load global tax configuration from localStorage
  const getGlobalTaxConfig = () => {
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

  const taxConfig = getGlobalTaxConfig();

  // Stabilized event handlers using useCallback to prevent re-renders
  const updateWorkStage = useCallback((index: number, field: string, value: string) => {
    setWorkStages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const updateAdditionalService = useCallback((index: number, field: string, value: string) => {
    setAdditionalServices(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const updateAdditionalLabor = useCallback((index: number, field: string, value: string) => {
    setAdditionalLabor(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const addLabor = useCallback(() => {
    setAdditionalLabor(prev => [...prev, { name: '', hours: '', rate: '' }]);
  }, []);

  const updateCustomSupply = useCallback((index: number, field: string, value: string) => {
    setCustomSupplies(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const addCustomSupply = useCallback(() => {
    setCustomSupplies(prev => [...prev, { name: '', quantity: '', pricePerUnit: '' }]);
  }, []);

  const removeCustomSupply = useCallback((index: number) => {
    setCustomSupplies(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  }, []);

  const removeLabor = useCallback((index: number) => {
    setAdditionalLabor(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  }, []);

  const addAdditionalService = useCallback(() => {
    setAdditionalServices(prev => [...prev, { name: '', hours: '', rate: 60 }]);
  }, []);

  const removeAdditionalService = useCallback((index: number) => {
    if (index >= 3) {
      setAdditionalServices(prev => prev.filter((_, i) => i !== index));
    }
  }, []);

  // Calculate totals
  const laborSubtotal = workStages.reduce((sum: number, stage: any) => {
    const hours = parseFloat(stage.hours) || 0;
    const rate = parseFloat(stage.rate.toString()) || 0;
    return sum + (hours * rate);
  }, 0);

  const additionalServicesSubtotal = useMemo(() => {
    return additionalServices.reduce((sum: number, service: any) => {
      const hours = parseFloat(service.hours) || 0;
      const rate = parseFloat(service.rate.toString()) || 0;
      return sum + (hours * rate);
    }, 0);
  }, [additionalServices]);

  const additionalLaborSubtotal = useMemo(() => {
    return additionalLabor.reduce((sum: number, member: any) => {
      const hours = parseFloat(member.hours) || 0;
      const rate = parseFloat(member.rate.toString()) || 0;
      return sum + (hours * rate);
    }, 0);
  }, [additionalLabor]);

  const paintSubtotal = useMemo(() => {
    return (parseFloat(paintCosts.pricePerGallon) || 0) * 
           (parseFloat(paintCosts.gallons) || 0) * 
           (parseFloat(paintCosts.coats) || 1);
  }, [paintCosts]);

  const customSuppliesSubtotal = useMemo(() => {
    return customSupplies.reduce((total: number, supply: any) => {
      return total + ((parseFloat(supply.quantity) || 0) * (parseFloat(supply.pricePerUnit) || 0));
    }, 0);
  }, [customSupplies]);

  const paintAndMaterialsSubtotal = useMemo(() => {
    const baseMaterialCost = paintSubtotal + customSuppliesSubtotal;
    if (materialMarkupEnabled && materialMarkupPercentage) {
      const markupMultiplier = 1 + (parseFloat(materialMarkupPercentage) / 100);
      return baseMaterialCost * markupMultiplier;
    }
    return baseMaterialCost;
  }, [paintSubtotal, customSuppliesSubtotal, materialMarkupEnabled, materialMarkupPercentage]);

  // Add missing variables for HTML template
  const materialsSubtotal = paintAndMaterialsSubtotal;
  const travelSubtotal = useMemo(() => {
    return (parseFloat(travelCosts.distance) || 0) * 
           (parseFloat(travelCosts.trips) || 0) * 
           (parseFloat(travelCosts.ratePerKm) || 0);
  }, [travelCosts]);
  
  // Calculate taxable vs non-taxable amounts - memoized for performance
  const taxableAmount = useMemo(() => laborSubtotal + additionalServicesSubtotal + additionalLaborSubtotal + travelSubtotal, [laborSubtotal, additionalServicesSubtotal, additionalLaborSubtotal, travelSubtotal]);
  const nonTaxableAmount = paintAndMaterialsSubtotal; // Materials already include taxes
  
  const subtotalBeforeTax = useMemo(() => taxableAmount + nonTaxableAmount, [taxableAmount, nonTaxableAmount]);
  const taxRate = useMemo(() => (taxConfig.gst + taxConfig.pst + taxConfig.hst + taxConfig.salesTax + taxConfig.vat + taxConfig.otherTax) / 100, [taxConfig]);
  const taxAmount = useMemo(() => taxableAmount * taxRate, [taxableAmount, taxRate]);
  const grandTotal = useMemo(() => subtotalBeforeTax + taxAmount, [subtotalBeforeTax, taxAmount]);

  // Legacy calculations for backward compatibility
  const subtotal = laborSubtotal + additionalServicesSubtotal + additionalLaborSubtotal + paintAndMaterialsSubtotal;

  // Email mutation
  const emailMutation = useMutation({
    mutationFn: async (pdfData: string) => {
      console.log('Sending estimate email with data:', {
        recipientEmail: project.clientEmail,
        clientName: project.clientName,
        pdfSize: pdfData.length
      });
      
      try {
        // Use FormData to avoid JSON stringification issues with large base64 data
        const formData = new FormData();
        formData.append('recipientEmail', project.clientEmail || '');
        formData.append('clientName', project.clientName);
        formData.append('estimateNumber', `EST-${Date.now()}`);
        formData.append('projectTitle', projectTitle || `${project.projectType} Project`);
        formData.append('totalAmount', grandTotal.toFixed(2));
        formData.append('customMessage', '');
        formData.append('pdfData', pdfData);
        
        const response = await fetch('/api/send-estimate-email', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Email response error:', response.status, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Email request failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Estimate sent successfully!"
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send estimate. Please try again.",
        variant: "destructive"
      });
      console.error('Email error:', error);
    }
  });

  const generateProfessionalHTML = () => {
    const logoUrl = currentLogo?.url || '/paint-brain-logo.png';
    
    // Generate services & labor section
    const servicesHTML = workStages.filter((stage: any) => (parseFloat(stage.hours) || 0) > 0).map((stage: any) => {
      const hours = parseFloat(stage.hours) || 0;
      const rate = parseFloat(stage.rate) || 0;
      const total = hours * rate;
      return `
        <tr style="border-bottom: 1px solid #E53E3E;">
          <td class="py-2 px-4 text-white">${stage.name}</td>
          <td class="py-2 px-4 text-center text-white">${hours}h</td>
          <td class="py-2 px-4 text-center text-white">$${rate}/hr</td>
          <td class="py-2 px-4 text-right font-semibold text-white">$${total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Generate additional labor section
    const additionalLaborHTML = additionalLabor.filter((labor: any) => (parseFloat(labor.hours) || 0) > 0).map((labor: any) => {
      const hours = parseFloat(labor.hours) || 0;
      const rate = parseFloat(labor.rate) || 0;
      const total = hours * rate;
      return `
        <tr style="border-bottom: 1px solid #E53E3E;">
          <td class="py-2 px-4 text-white">${labor.name || 'Additional Worker'}</td>
          <td class="py-2 px-4 text-center text-white">${hours}h</td>
          <td class="py-2 px-4 text-center text-white">$${rate}/hr</td>
          <td class="py-2 px-4 text-right font-semibold text-white">$${total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Generate additional services section
    const additionalServicesHTML = additionalServices.filter((service: any) => (parseFloat(service.hours) || 0) > 0).map((service: any) => {
      const hours = parseFloat(service.hours) || 0;
      const rate = parseFloat(service.rate) || 0;
      const total = hours * rate;
      return `
        <tr style="border-bottom: 1px solid #3182CE;">
          <td class="py-2 px-4 text-white">${service.name}</td>
          <td class="py-2 px-4 text-center text-white">${hours}h</td>
          <td class="py-2 px-4 text-center text-white">$${rate}/hr</td>
          <td class="py-2 px-4 text-right font-semibold text-white">$${total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Generate materials section
    const materialsHTML = [];
    if (paintSubtotal > 0) {
      materialsHTML.push(`
        <tr style="border-bottom: 1px solid #ECC94B;">
          <td class="py-2 px-4 text-white">Paint (${paintCosts.gallons} gal × ${paintCosts.coats} coats)</td>
          <td class="py-2 px-4 text-right font-semibold text-white">$${paintSubtotal.toFixed(2)}</td>
        </tr>
      `);
    }
    
    customSupplies.filter((supply: any) => (parseFloat(supply.quantity) || 0) > 0).forEach((supply: any) => {
      const total = (parseFloat(supply.quantity) || 0) * (parseFloat(supply.pricePerUnit) || 0);
      materialsHTML.push(`
        <tr style="border-bottom: 1px solid #ECC94B;">
          <td class="py-2 px-4 text-white">${supply.name} (${supply.quantity} × $${supply.pricePerUnit})</td>
          <td class="py-2 px-4 text-right font-semibold text-white">$${total.toFixed(2)}</td>
        </tr>
      `);
    });

    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Estimate PDF</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @media print {
        body { -webkit-print-color-adjust: exact; }
      }
    </style>
  </head>
  <body class="bg-black text-white font-sans p-8">
    <!-- Logo and Title -->
    <div class="flex flex-col items-center mb-8">
      <div class="h-16 mb-4 flex items-center justify-center">
        <img src="${logoUrl}" alt="Logo" class="h-16 object-contain" />
      </div>
      <h1 class="text-orange-500 text-3xl font-bold">ESTIMATE</h1>
    </div>

    <!-- Client & Company Info -->
    <div class="flex justify-between text-sm mb-10">
      <div>
        <p class="text-gray-300 font-semibold mb-2">Estimate For:</p>
        <p class="font-semibold">${project.clientName}</p>
        <p>${project.address}</p>
        <p>${project.clientCity || ''}, ${project.clientPostal || ''}</p>
        ${project.clientPhone ? `<p>${project.clientPhone}</p>` : ''}
        ${project.clientEmail ? `<p>${project.clientEmail}</p>` : ''}
      </div>
      <div class="text-right">
        <p class="text-gray-300 font-semibold mb-2">From:</p>
        <p class="font-semibold">A-Frame Painting</p>
        <p>884 Hayes Rd</p>
        <p>Manson's Landing, BC</p>
        <p>cortespainter@gmail.com</p>
      </div>
    </div>

    ${servicesHTML || additionalLaborHTML ? `
    <!-- Services & Labor -->
    <div class="mb-8">
      <div style="background-color: #E53E3E;" class="text-white px-4 py-3 rounded-t-lg">
        <h2 class="text-lg font-bold">Services & Labor</h2>
      </div>
      <div style="background-color: #2D3748; border: 2px solid #E53E3E; border-top: none;" class="rounded-b-lg p-4">
        <table class="w-full">
          <thead>
            <tr style="border-bottom: 2px solid #E53E3E;">
              <th class="py-2 px-4 text-left text-white">Service</th>
              <th class="py-2 px-4 text-center text-white">Hours</th>
              <th class="py-2 px-4 text-center text-white">Rate</th>
              <th class="py-2 px-4 text-right text-white">Total</th>
            </tr>
          </thead>
          <tbody>
            ${servicesHTML}
            ${additionalLaborHTML}
            <tr style="border-top: 2px solid #E53E3E;">
              <td colspan="3" class="py-2 px-4 font-semibold text-white">Labor Subtotal</td>
              <td class="py-2 px-4 text-right font-bold text-green-400">$${laborSubtotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}

    ${materialsHTML.length > 0 ? `
    <!-- Paint & Materials -->
    <div class="mb-8">
      <div style="background-color: #ECC94B;" class="text-white px-4 py-3 rounded-t-lg">
        <h2 class="text-lg font-bold">Paint & Materials (incl. taxes)</h2>
      </div>
      <div style="background-color: #2D3748; border: 2px solid #ECC94B; border-top: none;" class="rounded-b-lg p-4">
        <table class="w-full">
          <thead>
            <tr style="border-bottom: 2px solid #ECC94B;">
              <th class="py-2 px-4 text-left text-white">Item</th>
              <th class="py-2 px-4 text-right text-white">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${materialsHTML.join('')}
            <tr style="border-top: 2px solid #ECC94B;">
              <td class="py-2 px-4 font-semibold text-white">Materials Subtotal (incl. taxes)</td>
              <td class="py-2 px-4 text-right font-bold text-green-400">$${materialsSubtotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div class="text-xs text-gray-400 mt-2">
          <p>* Materials already include taxes paid at purchase - no additional tax applied</p>
        </div>
      </div>
    </div>
    ` : ''}

    ${additionalServicesHTML ? `
    <!-- Additional Services -->
    <div class="mb-8">
      <div style="background-color: #3182CE;" class="text-white px-4 py-3 rounded-t-lg">
        <h2 class="text-lg font-bold">Additional Services</h2>
      </div>
      <div style="background-color: #2D3748; border: 2px solid #3182CE; border-top: none;" class="rounded-b-lg p-4">
        <table class="w-full">
          <thead>
            <tr style="border-bottom: 2px solid #3182CE;">
              <th class="py-2 px-4 text-left text-white">Service</th>
              <th class="py-2 px-4 text-center text-white">Hours</th>
              <th class="py-2 px-4 text-center text-white">Rate</th>
              <th class="py-2 px-4 text-right text-white">Total</th>
            </tr>
          </thead>
          <tbody>
            ${additionalServicesHTML}
            <tr style="border-top: 2px solid #3182CE;">
              <td colspan="3" class="py-2 px-4 font-semibold text-white">Additional Services Subtotal</td>
              <td class="py-2 px-4 text-right font-bold text-green-400">$${additionalServicesSubtotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}

    ${travelSubtotal > 0 ? `
    <!-- Travel Costs -->
    <div class="mb-8">
      <div style="background-color: #38A169;" class="text-white px-4 py-3 rounded-t-lg">
        <h2 class="text-lg font-bold">Travel Costs</h2>
      </div>
      <div style="background-color: #2D3748; border: 2px solid #38A169; border-top: none;" class="rounded-b-lg p-4">
        <div class="text-white">
          <p>${travelCosts.distance}km × ${travelCosts.trips} trips × $${travelCosts.ratePerKm}/km = $${travelSubtotal.toFixed(2)}</p>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Summary Section - Purple -->
    <div class="mb-8">
      <div style="background-color: #8B5FBF;" class="text-white px-4 py-3 rounded-t-lg">
        <h2 class="text-lg font-bold">Summary</h2>
      </div>
      <div style="background-color: #2D3748; border: 2px solid #8B5FBF; border-top: none;" class="rounded-b-lg p-4">
        ${taxableAmount > 0 ? `
        <div class="flex justify-between mb-2 pb-2 text-white" style="border-bottom: 1px solid #8B5FBF;">
          <span>Taxable Services:</span>
          <span>$${taxableAmount.toFixed(2)}</span>
        </div>
        ` : ''}
        ${nonTaxableAmount > 0 ? `
        <div class="flex justify-between mb-2 pb-2 text-white" style="border-bottom: 1px solid #8B5FBF;">
          <span>Materials (incl. taxes):</span>
          <span>$${nonTaxableAmount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="flex justify-between mb-2 pb-2 text-white" style="border-bottom: 1px solid #8B5FBF;">
          <span>Subtotal:</span>
          <span>$${subtotalBeforeTax.toFixed(2)}</span>
        </div>
        ${taxRate > 0 && taxableAmount > 0 ? `
        <div class="flex justify-between mb-2 pb-2 text-white" style="border-bottom: 1px solid #8B5FBF;">
          <span>Tax (${(taxRate * 100).toFixed(1)}% on services only):</span>
          <span>$${taxAmount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="flex justify-between text-xl font-bold text-green-400 mt-2 pt-2" style="border-top: 2px solid #8B5FBF;">
          <span>Grand Total:</span>
          <span>$${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center text-gray-400 text-sm mt-8">
      <p>This estimate is valid for 30 days. Thank you for considering A-Frame Painting!</p>
    </div>
  </body>
</html>`;
  };

  const generatePDF = async (sendEmail = false) => {
    try {
      console.log('Starting PDF generation, sendEmail:', sendEmail);
      const htmlContent = generateProfessionalHTML();
      
      if (sendEmail) {
        // For email, create a hidden iframe to avoid popup issues
        console.log('Creating hidden iframe for PDF generation...');
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '800px';
        iframe.style.height = '4000px'; // Much larger height to accommodate long estimates
        document.body.appendChild(iframe);

        if (!iframe.contentDocument) {
          document.body.removeChild(iframe);
          throw new Error('Could not create PDF iframe.');
        }

        iframe.contentDocument.write(htmlContent);
        iframe.contentDocument.close();

        // Wait for content and Tailwind to load
        setTimeout(async () => {
          try {
            console.log('Capturing PDF for email from iframe...');
            if (!iframe.contentDocument) {
              throw new Error('Iframe document not available');
            }

            const canvas = await html2canvas(iframe.contentDocument.body, {
              scale: 1,
              useCORS: true,
              backgroundColor: '#000000',
              logging: false,
              width: 800,
              height: iframe.contentDocument.body.scrollHeight
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const pdf = new jsPDF();
            const imgWidth = 210;
            const pageHeight = 297; // A4 page height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            console.log('PDF content dimensions:', { 
              canvasHeight: canvas.height, 
              imgHeight: imgHeight, 
              pageHeight: pageHeight, 
              needsMultiplePages: imgHeight > pageHeight 
            });

            // If content fits on one page, add it normally
            if (imgHeight <= pageHeight) {
              pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
            } else {
              // Multi-page handling: create separate canvases for each page
              let position = 0;
              let pageNumber = 0;
              
              // Calculate how many pixels per mm for proper scaling
              const pixelsPerMm = canvas.height / imgHeight;
              const pageHeightPx = pageHeight * pixelsPerMm;
              
              while (position < imgHeight) {
                if (pageNumber > 0) {
                  pdf.addPage();
                }
                
                console.log(`Adding page ${pageNumber + 1}, position: ${position}mm, remaining: ${imgHeight - position}mm`);
                
                // Calculate the portion of canvas for this page
                const startY = position * pixelsPerMm;
                const endY = Math.min(startY + pageHeightPx, canvas.height);
                const pageCanvasHeight = endY - startY;
                
                // Create a canvas for just this page's content
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = pageCanvasHeight;
                const pageCtx = pageCanvas.getContext('2d');
                
                if (pageCtx) {
                  // Copy the relevant portion of the original canvas
                  pageCtx.drawImage(
                    canvas,
                    0, startY, canvas.width, pageCanvasHeight, // Source area
                    0, 0, canvas.width, pageCanvasHeight      // Destination area
                  );
                  
                  // Convert page canvas to image and add to PDF
                  const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.8);
                  const pageImgHeight = (pageCanvasHeight * imgWidth) / canvas.width;
                  
                  pdf.addImage(pageImgData, 'JPEG', 0, 0, imgWidth, pageImgHeight);
                }
                
                position += pageHeight;
                pageNumber++;
              }
              
              console.log(`Generated multi-page PDF with ${pageNumber} pages using canvas slicing`);
            }
            
            const pdfBase64 = pdf.output('datauristring').split(',')[1];
            console.log('Generated PDF for email, size:', pdfBase64.length, 'characters');
            
            document.body.removeChild(iframe);
            emailMutation.mutate(pdfBase64);
          } catch (error) {
            console.error('Email PDF generation error:', error);
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
            throw error;
          }
        }, 3000); // Increased wait time for better reliability
      } else {
        // For download, create proper PDF with better handling
        console.log('Opening PDF preview window...');
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (!printWindow) {
          toast({
            title: "Popup Blocked",
            description: "Please allow popups and try again",
            variant: "destructive"
          });
          return;
        }
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for all resources to load before showing print dialog
        const waitForLoad = () => {
          if (printWindow.document.readyState === 'complete') {
            setTimeout(() => {
              console.log('Opening print dialog...');
              printWindow.print();
            }, 1000);
          } else {
            setTimeout(waitForLoad, 100);
          }
        };
        
        waitForLoad();
        
        toast({
          title: "PDF Ready",
          description: "Print dialog opened. Use 'Save as PDF' in print options.",
        });
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "PDF Error",
        description: error instanceof Error ? error.message : "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Don't render content until initialized to prevent jitter
  if (!isInitialized && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] h-[90vh] overflow-hidden bg-black text-white flex items-center justify-center">
          <div className="text-[#8B5FBF]">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] h-[90vh] overflow-y-auto bg-black text-white [&>button]:hidden">
        <DialogHeader className="pb-1">
          <DialogTitle className="sr-only">Generate Estimate</DialogTitle>
        </DialogHeader>

        {/* Custom Close Button - aligned right with container below, very close */}
        <div className="flex justify-end mb-1">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-md hover:bg-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Estimate Details */}
          <Card className="bg-gray-900 border-[#E53E3E]">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-800 transition-colors"
              onClick={() => toggleSection('estimateDetails')}
            >
              <CardTitle className="text-[#E53E3E] flex items-center justify-between">
                Estimate Details
                {expandedSections.estimateDetails ? (
                  <ChevronDown className="w-5 h-5 text-[#E53E3E]" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-[#E53E3E]" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.estimateDetails && (
              <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Project Title</label>
                  <Input
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Enter project title"
                    className="bg-gray-800 border-[#E53E3E] text-white"
                    style={{ minHeight: '40px' }}

                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <div className="relative">
                    <Button
                      type="button"
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="w-full bg-gray-800 border-[#E53E3E] text-white hover:bg-gray-700 justify-start"
                      variant="outline"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {estimateDate ? (() => {
                        const [year, month, day] = estimateDate.split('-');
                        return `${month}/${day}/${year}`;
                      })() : 'Select date'}
                    </Button>
                    
                    {showCalendar && (
                      <div className="absolute top-full left-0 z-50 mt-1 bg-black border border-gray-700 rounded-lg shadow-lg">
                        <PaintBrainCalendar
                          selectedDate={estimateDate}
                          onDateSelect={(date: string) => {
                            setEstimateDate(date);
                            setShowCalendar(false);
                          }}
                          maxDate={undefined}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Material Markup Control */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-[#E53E3E]">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-gray-400">
                      No Markup
                    </span>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        id="material-markup-toggle"
                        checked={materialMarkupEnabled}
                        onChange={(e) => setMaterialMarkupEnabled(e.target.checked)}
                        className="sr-only"
                      />
                      <label 
                        htmlFor="material-markup-toggle" 
                        className="block w-12 h-6 rounded-full cursor-pointer transition-colors bg-gray-600"
                      >
                        <span 
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                            materialMarkupEnabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </label>
                    </div>
                    <span className={`text-xs ${materialMarkupEnabled ? 'text-red-500' : 'text-gray-400'}`}>
                      Markup
                    </span>
                  </div>
                </div>
                
                {materialMarkupEnabled && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Markup Percentage</label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={materialMarkupPercentage}
                        onChange={(e) => setMaterialMarkupPercentage(e.target.value)}
                        placeholder="Enter markup %"
                        className="bg-gray-800 border-[#E53E3E] text-white pr-8"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">%</span>
                    </div>
                  </div>
                )}
              </div>
              </CardContent>
            )}
          </Card>

          {/* Services & Labor */}
          <Card className="bg-gray-900 border-[#ECC94B] transform-gpu will-change-contents">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-800 transition-colors"
              onClick={() => toggleSection('servicesLabor')}
            >
              <CardTitle className="text-[#ECC94B] flex items-center justify-between">
                Services & Labor
                {expandedSections.servicesLabor ? (
                  <ChevronDown className="w-5 h-5 text-[#ECC94B]" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-[#ECC94B]" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.servicesLabor && (
              <CardContent className="space-y-4">
                {workStages.map((stage: any, index: number) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-800 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium mb-2">{stage.name}</label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Hours</label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min="0"
                        value={stage.hours}
                        onChange={(e) => updateWorkStage(index, 'hours', e.target.value)}
                        placeholder="0"
                        className="bg-gray-700 border-[#ECC94B] text-white transform-gpu will-change-contents"
                        style={{ minHeight: '40px' }}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Rate/Hour</label>
                      <Input
                        type="number"
                        min="0"
                        value={stage.rate}
                        onChange={(e) => updateWorkStage(index, 'rate', e.target.value)}
                        className="bg-gray-700 border-[#ECC94B] text-white"
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                    <div className="md:col-span-3 text-right text-[#6A9955] font-semibold">
                      Total: ${((parseFloat(stage.hours) || 0) * (parseFloat(stage.rate.toString()) || 0)).toFixed(2)}
                    </div>
                  </div>
                ))}
                <div className="text-right text-lg font-semibold text-[#6A9955]">
                  Labor Subtotal: ${laborSubtotal.toFixed(2)}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Paint & Materials */}
          <Card className="bg-gray-900 border-[#6A9955] transform-gpu will-change-contents">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-800 transition-colors"
              onClick={() => toggleSection('paintMaterials')}
            >
              <CardTitle className="text-[#6A9955] flex items-center justify-between">
                Paint & Materials
                {expandedSections.paintMaterials ? (
                  <ChevronDown className="w-5 h-5 text-[#6A9955]" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-[#6A9955]" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.paintMaterials && (
              <CardContent className="space-y-4">
              <Button
                onClick={addCustomSupply}
                size="sm"
                className="bg-[#6A9955] hover:bg-[#5A8447] text-white px-3 py-1"
              >
                <Plus className="w-4 h-4 mr-1" />
                Supplies
              </Button>
              {/* Paint Costs Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-800 rounded-lg border border-[#6A9955]">
                <div>
                  <label className="block text-sm font-medium mb-2">Price per Gallon</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={paintCosts.pricePerGallon}
                    onChange={(e) => setPaintCosts((prev: any) => ({ ...prev, pricePerGallon: e.target.value }))}
                    placeholder="0.00"
                    className="bg-gray-700 border-[#6A9955] text-white"
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Gallons</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.25"
                    min="0"
                    value={paintCosts.gallons}
                    onChange={(e) => setPaintCosts((prev: any) => ({ ...prev, gallons: e.target.value }))}
                    placeholder="0"
                    className="bg-gray-700 border-[#6A9955] text-white"
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Coats</label>
                  <Select 
                    value={paintCosts.coats} 
                    onValueChange={(value) => setPaintCosts((prev: any) => ({ ...prev, coats: value }))}
                  >
                    <SelectTrigger className="bg-gray-700 border-[#6A9955] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="1">1 Coat</SelectItem>
                      <SelectItem value="2">2 Coats</SelectItem>
                      <SelectItem value="3">3 Coats</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3 text-right text-[#6A9955] font-semibold">
                  Paint Total: ${paintSubtotal.toFixed(2)}
                </div>
              </div>

              {/* Custom Supplies Section */}
              {customSupplies.map((supply: any, index: number) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-800 rounded-lg border border-[#D4A574]">
                  <div>
                    <label className="block text-sm font-medium mb-2">Supply Item</label>
                    <Input
                      value={supply.name}
                      onChange={(e) => updateCustomSupply(index, 'name', e.target.value)}
                      placeholder="Enter item name"
                      className="bg-gray-700 border-[#D4A574] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Quantity</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      value={supply.quantity}
                      onChange={(e) => updateCustomSupply(index, 'quantity', e.target.value)}
                      placeholder="0"
                      className="bg-gray-700 border-[#D4A574] text-white"
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Price per Unit</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={supply.pricePerUnit}
                      onChange={(e) => updateCustomSupply(index, 'pricePerUnit', e.target.value)}
                      placeholder="0.00"
                      className="bg-gray-700 border-[#D4A574] text-white"
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  <div className="flex flex-col justify-between">
                    <div className="text-right text-[#6A9955] font-semibold mb-2">
                      Total: ${((parseFloat(supply.quantity) || 0) * (parseFloat(supply.pricePerUnit) || 0)).toFixed(2)}
                    </div>
                    {customSupplies.length > 1 && (
                      <Button
                        onClick={() => removeCustomSupply(index)}
                        size="sm"
                        variant="destructive"
                        className="ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {/* Total Materials Section */}
                <div className="text-right text-lg font-semibold text-[#6A9955]">
                  Total Materials: ${paintAndMaterialsSubtotal.toFixed(2)}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Additional Labor (Crew Members) */}
          <Card className="bg-gray-900 border-[#3182CE] transform-gpu will-change-contents">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-800 transition-colors"
              onClick={() => toggleSection('additionalLabor')}
            >
              <CardTitle className="text-[#3182CE] flex items-center justify-between">
                Additional Labor
                {expandedSections.additionalLabor ? (
                  <ChevronDown className="w-5 h-5 text-[#3182CE]" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-[#3182CE]" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.additionalLabor && (
              <CardContent className="space-y-4">
              <Button
                onClick={addLabor}
                size="sm"
                className="bg-[#3182CE] hover:bg-[#2C6CB8] text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Crew
              </Button>
              {additionalLabor.map((member: any, index: number) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-800 rounded-lg border border-[#3182CE]">
                  <div>
                    <label className="block text-sm font-medium mb-2">Crew Member Name</label>
                    <Input
                      value={member.name}
                      onChange={(e) => updateAdditionalLabor(index, 'name', e.target.value)}
                      placeholder="Enter name"
                      className="bg-gray-700 border-[#3182CE] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Hours</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0"
                      value={member.hours}
                      onChange={(e) => updateAdditionalLabor(index, 'hours', e.target.value)}
                      placeholder="0"
                      className="bg-gray-700 border-[#3182CE] text-white"
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Rate/Hour</label>
                    <Input
                      type="number"
                      min="0"
                      value={member.rate}
                      onChange={(e) => updateAdditionalLabor(index, 'rate', e.target.value)}
                      placeholder="0"
                      className="bg-gray-700 border-[#3182CE] text-white"
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  <div className="flex flex-col justify-between">
                    <div className="text-right text-[#6A9955] font-semibold mb-2">
                      Total: ${((parseFloat(member.hours) || 0) * (parseFloat(member.rate) || 0)).toFixed(2)}
                    </div>
                    {additionalLabor.length > 1 && (
                      <Button
                        onClick={() => removeLabor(index)}
                        size="sm"
                        variant="destructive"
                        className="ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
                <div className="text-right text-lg font-semibold text-[#3182CE]">
                  Additional Labor Total: ${additionalLaborSubtotal.toFixed(2)}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Additional Services */}
          <Card className="bg-gray-900 border-[#8B5FBF] transform-gpu will-change-contents">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-800 transition-colors"
              onClick={() => toggleSection('additionalServices')}
            >
              <CardTitle className="text-[#8B5FBF] flex items-center justify-between">
                Additional Services
                {expandedSections.additionalServices ? (
                  <ChevronDown className="w-5 h-5 text-[#8B5FBF]" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-[#8B5FBF]" />
                )}
              </CardTitle>
            </CardHeader>
            {expandedSections.additionalServices && (
              <CardContent className="space-y-4">
              <Button
                onClick={addAdditionalService}
                size="sm"
                className="bg-[#8B5FBF] hover:bg-[#7A54A8] text-white px-3 py-1"
              >
                <Plus className="w-5 h-5 mr-1" />
                Services
              </Button>
              {additionalServices.map((service: any, index: number) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-800 rounded-lg border border-[#8B5FBF]">
                  <div>
                    <label className="block text-sm font-medium mb-2">Service Name</label>
                    <Input
                      value={service.name}
                      onChange={(e) => updateAdditionalService(index, 'name', e.target.value)}
                      placeholder="Enter service name"
                      className="bg-gray-700 border-[#8B5FBF] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Hours</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0"
                      value={service.hours}
                      onChange={(e) => updateAdditionalService(index, 'hours', e.target.value)}
                      placeholder="0"
                      className="bg-gray-700 border-[#8B5FBF] text-white"
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Rate/Hour</label>
                    <Input
                      type="number"
                      min="0"
                      value={service.rate}
                      onChange={(e) => updateAdditionalService(index, 'rate', e.target.value)}
                      placeholder="0"
                      className="bg-gray-700 border-[#8B5FBF] text-white"
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  <div className="flex flex-col justify-between">
                    <div className="text-right text-[#6A9955] font-semibold mb-2">
                      Total: ${((parseFloat(service.hours) || 0) * (parseFloat(service.rate.toString()) || 0)).toFixed(2)}
                    </div>
                    {index >= 3 && (
                      <Button
                        onClick={() => removeAdditionalService(index)}
                        size="sm"
                        variant="destructive"
                        className="ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
                <div className="text-right text-lg font-semibold text-[#8B5FBF]">
                  Additional Services: ${additionalServicesSubtotal.toFixed(2)}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Summary */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-[#569CD6]">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Labor Subtotal:</span>
                <span>${laborSubtotal.toFixed(2)}</span>
              </div>
              {additionalLaborSubtotal > 0 && (
                <div className="flex justify-between">
                  <span>Additional Labor:</span>
                  <span>${additionalLaborSubtotal.toFixed(2)}</span>
                </div>
              )}
              {paintAndMaterialsSubtotal > 0 && (
                <div className="flex justify-between">
                  <span>Paint & Materials:</span>
                  <span>${paintAndMaterialsSubtotal.toFixed(2)}</span>
                </div>
              )}
              {additionalServicesSubtotal > 0 && (
                <div className="flex justify-between">
                  <span>Additional Services:</span>
                  <span>${additionalServicesSubtotal.toFixed(2)}</span>
                </div>
              )}
              <hr className="border-gray-600" />
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({(taxConfig.gst + taxConfig.pst + taxConfig.hst + taxConfig.salesTax + taxConfig.vat + taxConfig.otherTax).toFixed(1)}%):</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <hr className="border-gray-600" />
              <div className="flex justify-between text-xl font-bold text-[#6A9955]">
                <span>Grand Total:</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Toggle with Dynamic Label */}
          <div className="flex flex-col items-center gap-4 mb-6 p-6 bg-black rounded-lg border border-gray-600" style={{ 
            borderColor: actionMode === 'email' ? '#EA580C' : '#8B5FBF' 
          }}>
            {/* Toggle Switch */}
            <button
              onClick={() => setActionMode(actionMode === 'email' ? 'download' : 'email')}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                actionMode === 'email' ? 'bg-[#EA580C]' : 'bg-[#8B5FBF]'
              }`}
            >
              <span
                className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform duration-200 ${
                  actionMode === 'email' ? 'translate-x-1' : 'translate-x-11'
                }`}
              />
            </button>
            
            {/* Dynamic Action Label */}
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => generatePDF(actionMode === 'email')}
            >
              {actionMode === 'email' ? (
                <>
                  <Mail className="w-8 h-8 text-[#EA580C]" />
                  <span className="text-[#EA580C] text-xl font-bold">Send</span>
                </>
              ) : (
                <>
                  <Download className="w-8 h-8 text-[#8B5FBF]" />
                  <span className="text-[#8B5FBF] text-xl font-bold">PDF</span>
                </>
              )}
            </div>
            
            {/* Status Text */}
            {emailMutation.isPending && (
              <div className="text-[#EA580C] text-sm font-medium">
                Sending estimate...
              </div>
            )}
          </div>
        </div>

        {/* Hidden PDF Template */}
        <div 
          ref={printRef} 
          className="fixed -left-[9999px] w-[210mm] bg-black p-8 text-white"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          <div className="text-center mb-8">
            {logoVisibility.estimates && (
              <img 
                src={currentLogo?.url || "/aframe-logo.png"} 
                alt="Business Logo" 
                className="mx-auto mb-4 h-8"
              />
            )}
            <h1 className="text-3xl font-bold text-[#8B5FBF]">ESTIMATE</h1>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-[#8B5FBF] mb-2">From:</h3>
              <p>A-Frame Painting</p>
              <p>Professional Painting Services</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#8B5FBF] mb-2">To:</h3>
              <p>{project.clientName}</p>
              <p>{project.address}</p>
              {project.clientCity && <p>{project.clientCity}</p>}
              {project.clientPhone && <p>{project.clientPhone}</p>}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-[#8B5FBF] mb-2">Project Details:</h3>
            <p><strong>Project:</strong> {projectTitle || `${project.projectType} Project`}</p>
            <p><strong>Date:</strong> {new Date(estimateDate).toLocaleDateString()}</p>
          </div>

          {/* Services & Labor Section */}
          {laborSubtotal > 0 && (
            <div className="mb-6">
              <div className="p-4 rounded-t-lg" style={{ backgroundColor: '#E53E3E' }}>
                <h3 className="text-lg font-semibold text-white">Services & Labor</h3>
              </div>
              <div className="rounded-b-lg border-2 border-t-0 p-4" style={{ borderColor: '#E53E3E', backgroundColor: '#2D3748' }}>
                {workStages.filter((stage: any) => parseFloat(stage.hours) > 0).map((stage: any, index: number) => (
                  <div key={index} className="flex justify-between mb-2 pb-2 text-white" style={{ borderBottom: '1px solid #E53E3E' }}>
                    <span>{stage.name} ({stage.hours} hrs @ ${stage.rate}/hr)</span>
                    <span>${((parseFloat(stage.hours) || 0) * (parseFloat(stage.rate.toString()) || 0)).toFixed(2)}</span>
                  </div>
                ))}
                {additionalLabor.filter((member: any) => member.name && parseFloat(member.hours) > 0).map((member: any, index: number) => (
                  <div key={`labor-${index}`} className="flex justify-between mb-2 pb-2 text-white" style={{ borderBottom: '1px solid #E53E3E' }}>
                    <span>{member.name} ({member.hours} hrs @ ${member.rate}/hr)</span>
                    <span>${((parseFloat(member.hours) || 0) * (parseFloat(member.rate) || 0)).toFixed(2)}</span>
                  </div>
                ))}
                <div className="text-right font-semibold text-[#6A9955] mt-2 pt-2" style={{ borderTop: '2px solid #E53E3E' }}>
                  Labor Subtotal: ${laborSubtotal.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Paint & Materials Section */}
          {paintAndMaterialsSubtotal > 0 && (
            <div className="mb-6">
              <div className="p-4 rounded-t-lg" style={{ backgroundColor: '#ECC94B' }}>
                <h3 className="text-lg font-semibold text-white">Paint & Materials</h3>
              </div>
              <div className="rounded-b-lg border-2 border-t-0 p-4" style={{ borderColor: '#ECC94B', backgroundColor: '#2D3748' }}>
                {paintSubtotal > 0 && (
                  <div className="flex justify-between mb-2 pb-2 text-white" style={{ borderBottom: '1px solid #ECC94B' }}>
                    <span>Paint ({paintCosts.gallons} gallons @ ${paintCosts.pricePerGallon}/gal, {paintCosts.coats} coats)</span>
                    <span>${paintSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {customSupplies.filter((supply: any) => parseFloat(supply.quantity) > 0 && parseFloat(supply.pricePerUnit) > 0).map((supply: any, index: number) => (
                  <div key={index} className="flex justify-between mb-2 pb-2 text-white" style={{ borderBottom: index < customSupplies.filter((supply: any) => parseFloat(supply.quantity) > 0 && parseFloat(supply.pricePerUnit) > 0).length - 1 ? '1px solid #ECC94B' : '1px solid #ECC94B' }}>
                    <span>{supply.name} ({supply.quantity} units @ ${supply.pricePerUnit}/unit)</span>
                    <span>${((parseFloat(supply.quantity) || 0) * (parseFloat(supply.pricePerUnit) || 0)).toFixed(2)}</span>
                  </div>
                ))}
                <div className="text-right font-semibold text-[#6A9955] mt-2 pt-2" style={{ borderTop: '2px solid #ECC94B' }}>
                  Materials Subtotal: ${paintAndMaterialsSubtotal.toFixed(2)}
                </div>
              </div>
            </div>
          )}



          {/* Travel Costs Section */}
          {travelSubtotal > 0 && (
            <div className="mb-6">
              <div className="p-4 rounded-t-lg" style={{ backgroundColor: '#38A169' }}>
                <h3 className="text-lg font-semibold text-white">Travel Costs</h3>
              </div>
              <div className="rounded-b-lg border-2 border-t-0 p-4" style={{ borderColor: '#38A169', backgroundColor: '#2D3748' }}>
                <div className="text-white">
                  <p>{travelCosts.distance}km × {travelCosts.trips} trips × ${travelCosts.ratePerKm}/km = ${travelSubtotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Additional Services Section */}
          {additionalServicesSubtotal > 0 && (
            <div className="mb-6">
              <div className="p-4 rounded-t-lg" style={{ backgroundColor: '#3182CE' }}>
                <h3 className="text-lg font-semibold text-white">Additional Services</h3>
              </div>
              <div className="rounded-b-lg border-2 border-t-0 p-4" style={{ borderColor: '#3182CE', backgroundColor: '#2D3748' }}>
                {additionalServices.filter((service: any) => parseFloat(service.hours) > 0).map((service: any, index: number) => (
                  <div key={index} className="flex justify-between mb-2 pb-2 text-white" style={{ borderBottom: '1px solid #3182CE' }}>
                    <span>{service.name} ({service.hours} hrs @ ${service.rate}/hr)</span>
                    <span>${((parseFloat(service.hours) || 0) * (parseFloat(service.rate.toString()) || 0)).toFixed(2)}</span>
                  </div>
                ))}
                <div className="text-right font-semibold text-[#3182CE] mt-2 pt-2" style={{ borderTop: '2px solid #3182CE' }}>
                  Additional Services: ${additionalServicesSubtotal.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Summary Section - Purple */}
          <div className="mb-6">
            <div className="p-4 rounded-t-lg" style={{ backgroundColor: '#8B5FBF' }}>
              <h3 className="text-lg font-semibold text-white">Summary</h3>
            </div>
            <div className="rounded-b-lg border-2 border-t-0 p-4" style={{ borderColor: '#8B5FBF', backgroundColor: '#2D3748' }}>
              <div className="flex justify-between mb-2 pb-2 text-white" style={{ borderBottom: '1px solid #8B5FBF' }}>
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2 pb-2 text-white" style={{ borderBottom: '1px solid #8B5FBF' }}>
                <span>Tax ({(taxConfig.gst + taxConfig.pst + taxConfig.hst + taxConfig.salesTax + taxConfig.vat + taxConfig.otherTax).toFixed(1)}%):</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-[#6A9955] mt-2 pt-2" style={{ borderTop: '2px solid #8B5FBF' }}>
                <span>Grand Total:</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-8 text-gray-400">
            <p>Thanks for considering A-Frame Painting!</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}