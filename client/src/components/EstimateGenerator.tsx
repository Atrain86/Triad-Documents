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
    setWorkStages((prev: any) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const updateAdditionalService = useCallback((index: number, field: string, value: string) => {
    setAdditionalServices((prev: any) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const updateAdditionalLabor = useCallback((index: number, field: string, value: string) => {
    setAdditionalLabor((prev: any) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const addLabor = useCallback(() => {
    setAdditionalLabor((prev: any) => [...prev, { name: '', hours: '', rate: '' }]);
  }, []);

  const updateCustomSupply = useCallback((index: number, field: string, value: string) => {
    setCustomSupplies((prev: any) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const addCustomSupply = useCallback(() => {
    setCustomSupplies((prev: any) => [...prev, { name: '', quantity: '', pricePerUnit: '' }]);
  }, []);

  const removeCustomSupply = useCallback((index: number) => {
    setCustomSupplies((prev: any) => prev.length > 1 ? prev.filter((_: any, i: number) => i !== index) : prev);
  }, []);

  const removeLabor = useCallback((index: number) => {
    setAdditionalLabor((prev: any) => prev.length > 1 ? prev.filter((_: any, i: number) => i !== index) : prev);
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
    
    // Generate services & labor section with alternating row colors
    const servicesHTML = workStages.filter((stage: any) => (parseFloat(stage.hours) || 0) > 0).map((stage: any, index: number) => {
      const hours = parseFloat(stage.hours) || 0;
      const rate = parseFloat(stage.rate) || 0;
      const total = hours * rate;
      const rowClass = index % 2 === 0 ? '' : 'bg-gray-700';
      return `
        <tr class="${rowClass}" style="border-bottom: 1px solid #E53E3E;">
          <td class="p-3 text-white">${stage.name}</td>
          <td class="p-3 text-center text-white">${hours}h</td>
          <td class="p-3 text-center text-white">$${rate}/hr</td>
          <td class="p-3 text-right font-semibold text-white">$${total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Generate additional labor section with alternating row colors (continuing index from services)
    const serviceCount = workStages.filter((stage: any) => (parseFloat(stage.hours) || 0) > 0).length;
    const additionalLaborHTML = additionalLabor.filter((labor: any) => (parseFloat(labor.hours) || 0) > 0).map((labor: any, index: number) => {
      const hours = parseFloat(labor.hours) || 0;
      const rate = parseFloat(labor.rate) || 0;
      const total = hours * rate;
      const rowClass = (serviceCount + index) % 2 === 0 ? '' : 'bg-gray-700';
      return `
        <tr class="${rowClass}" style="border-bottom: 1px solid #E53E3E;">
          <td class="p-3 text-white">${labor.name || 'Additional Labor'}</td>
          <td class="p-3 text-center text-white">${hours}h</td>
          <td class="p-3 text-center text-white">$${rate}/hr</td>
          <td class="p-3 text-right font-semibold text-white">$${total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Generate additional services section
    const totalPreviousRows = serviceCount + additionalLabor.filter((labor: any) => (parseFloat(labor.hours) || 0) > 0).length;
    const additionalServicesHTML = additionalServices.filter((service: any) => (parseFloat(service.hours) || 0) > 0).map((service: any, index: number) => {
      const hours = parseFloat(service.hours) || 0;
      const rate = parseFloat(service.rate) || 0;
      const total = hours * rate;
      const rowClass = (totalPreviousRows + index) % 2 === 0 ? '' : 'bg-gray-700';
      return `
        <tr class="${rowClass}" style="border-bottom: 1px solid #E53E3E;">
          <td class="p-3 text-white">${service.name}</td>
          <td class="p-3 text-center text-white">${hours}h</td>
          <td class="p-3 text-center text-white">$${rate}/hr</td>
          <td class="p-3 text-right font-semibold text-white">$${total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Generate paint & materials section
    const materialRows = [];
    
    // Add paint row if there's any paint cost
    if (paintSubtotal > 0) {
      materialRows.push(`
        <tr style="border-bottom: 1px solid #D4AC0D;">
          <td class="p-3 text-white">Paint (${paintCosts.gallons} gallons × ${paintCosts.coats} coats)</td>
          <td class="p-3 text-center text-white">${parseFloat(paintCosts.gallons) * parseFloat(paintCosts.coats)}</td>
          <td class="p-3 text-center text-white">$${parseFloat(paintCosts.pricePerGallon || '0').toFixed(2)}</td>
          <td class="p-3 text-right font-semibold text-white">$${paintSubtotal.toFixed(2)}</td>
        </tr>
      `);
    }

    // Add custom supplies
    customSupplies.filter((supply: any) => (parseFloat(supply.quantity) || 0) > 0 && (parseFloat(supply.pricePerUnit) || 0) > 0).forEach((supply: any, index: number) => {
      const quantity = parseFloat(supply.quantity) || 0;
      const pricePerUnit = parseFloat(supply.pricePerUnit) || 0;
      const total = quantity * pricePerUnit;
      const rowClass = (materialRows.length + index) % 2 === 0 ? '' : 'bg-gray-700';
      materialRows.push(`
        <tr class="${rowClass}" style="border-bottom: 1px solid #D4AC0D;">
          <td class="p-3 text-white">${supply.name}</td>
          <td class="p-3 text-center text-white">${quantity}</td>
          <td class="p-3 text-center text-white">$${pricePerUnit.toFixed(2)}</td>
          <td class="p-3 text-right font-semibold text-white">$${total.toFixed(2)}</td>
        </tr>
      `);
    });

    const materialsHTML = materialRows.join('');

    // Generate travel section
    const travelHTML = travelSubtotal > 0 ? `
      <tr style="border-bottom: 1px solid #6A9955;">
        <td class="p-3 text-white">Travel (${travelCosts.distance}km × ${travelCosts.trips} trips)</td>
        <td class="p-3 text-center text-white">${parseFloat(travelCosts.distance) * parseFloat(travelCosts.trips)}</td>
        <td class="p-3 text-center text-white">$${parseFloat(travelCosts.ratePerKm || '0').toFixed(2)}/km</td>
        <td class="p-3 text-right font-semibold text-white">$${travelSubtotal.toFixed(2)}</td>
      </tr>
    ` : '';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>A-Frame Painting Estimate</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #1A1A1A;
            color: white;
            margin: 0;
            padding: 40px;
            line-height: 1.6;
          }
          .estimate-container {
            background-color: #2D2D2D;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #8B5FBF;
            padding-bottom: 30px;
          }
          .logo {
            width: 120px;
            height: auto;
            margin-bottom: 20px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #8B5FBF;
            margin-bottom: 8px;
          }
          .estimate-title {
            font-size: 24px;
            color: #569CD6;
            margin-bottom: 10px;
          }
          .estimate-date {
            color: #A0A0A0;
            font-size: 14px;
          }
          .client-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            background-color: #3A3A3A;
            padding: 25px;
            border-radius: 8px;
          }
          .client-details h3 {
            color: #569CD6;
            margin-bottom: 15px;
            font-size: 18px;
          }
          .client-details p {
            margin: 5px 0;
            color: #E0E0E0;
          }
          .section {
            margin-bottom: 35px;
          }
          .section-header {
            color: #8B5FBF;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #8B5FBF;
          }
          .services-header {
            color: #E53E3E;
            border-bottom-color: #E53E3E;
          }
          .materials-header {
            color: #D4AC0D;
            border-bottom-color: #D4AC0D;
          }
          .travel-header {
            color: #6A9955;
            border-bottom-color: #6A9955;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background-color: #333;
            border-radius: 8px;
            overflow: hidden;
          }
          th {
            background-color: #404040;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: bold;
            font-size: 14px;
          }
          th:last-child {
            text-align: right;
          }
          .totals-section {
            background-color: #3A3A3A;
            padding: 25px;
            border-radius: 8px;
            margin-top: 30px;
          }
          .totals-header {
            color: #8B5FBF;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #555;
          }
          .total-row:last-child {
            border-bottom: none;
            font-size: 18px;
            font-weight: bold;
            color: #8B5FBF;
            margin-top: 10px;
            padding-top: 15px;
            border-top: 2px solid #8B5FBF;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 25px;
            border-top: 2px solid #8B5FBF;
            color: #A0A0A0;
          }
          .footer p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="estimate-container">
          <div class="header">
            ${logoVisibility.estimates && currentLogo ? `<img src="${logoUrl}" alt="Company Logo" class="logo">` : ''}
            <div class="company-name">A-FRAME PAINTING</div>
            <div class="estimate-title">PROJECT ESTIMATE</div>
            <div class="estimate-date">${new Date(estimateDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
          </div>

          <div class="client-info">
            <div class="client-details">
              <h3>Client Information</h3>
              <p><strong>${project.clientName}</strong></p>
              <p>${project.address}</p>
              <p>${project.clientCity ? project.clientCity + ', ' : ''}${project.clientPostal || ''}</p>
              ${project.clientEmail ? `<p>Email: ${project.clientEmail}</p>` : ''}
              ${project.clientPhone ? `<p>Phone: ${project.clientPhone}</p>` : ''}
            </div>
            <div class="client-details">
              <h3>Project Details</h3>
              <p><strong>Type:</strong> ${project.projectType}</p>
              ${projectTitle ? `<p><strong>Description:</strong> ${projectTitle}</p>` : ''}
              <p><strong>Status:</strong> ${project.status}</p>
            </div>
          </div>

          ${(servicesHTML || additionalLaborHTML || additionalServicesHTML) ? `
          <div class="section">
            <div class="section-header services-header">Services & Labor</div>
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th style="text-align: center;">Hours</th>
                  <th style="text-align: center;">Rate</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${servicesHTML}
                ${additionalLaborHTML}
                ${additionalServicesHTML}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${materialsHTML ? `
          <div class="section">
            <div class="section-header materials-header">Paint & Materials</div>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: center;">Unit Price</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${materialsHTML}
                ${materialMarkupEnabled && materialMarkupPercentage ? `
                <tr style="border-top: 2px solid #D4AC0D;">
                  <td class="p-3 text-white font-semibold">Material Markup (${materialMarkupPercentage}%)</td>
                  <td class="p-3"></td>
                  <td class="p-3"></td>
                  <td class="p-3 text-right font-semibold text-white">$${(paintAndMaterialsSubtotal - (paintSubtotal + customSuppliesSubtotal)).toFixed(2)}</td>
                </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${travelHTML ? `
          <div class="section">
            <div class="section-header travel-header">Travel Costs</div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: center;">Distance</th>
                  <th style="text-align: center;">Rate</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${travelHTML}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="totals-section">
            <div class="totals-header">Estimate Summary</div>
            ${laborSubtotal > 0 ? `<div class="total-row"><span>Services & Labor:</span><span>$${laborSubtotal.toFixed(2)}</span></div>` : ''}
            ${additionalLaborSubtotal > 0 ? `<div class="total-row"><span>Additional Labor:</span><span>$${additionalLaborSubtotal.toFixed(2)}</span></div>` : ''}
            ${additionalServicesSubtotal > 0 ? `<div class="total-row"><span>Additional Services:</span><span>$${additionalServicesSubtotal.toFixed(2)}</span></div>` : ''}
            ${paintAndMaterialsSubtotal > 0 ? `<div class="total-row"><span>Paint & Materials:</span><span>$${paintAndMaterialsSubtotal.toFixed(2)}</span></div>` : ''}
            ${travelSubtotal > 0 ? `<div class="total-row"><span>Travel Costs:</span><span>$${travelSubtotal.toFixed(2)}</span></div>` : ''}
            <div class="total-row"><span>Subtotal:</span><span>$${subtotalBeforeTax.toFixed(2)}</span></div>
            ${taxAmount > 0 ? `<div class="total-row"><span>Tax (${(taxRate * 100).toFixed(1)}%):</span><span>$${taxAmount.toFixed(2)}</span></div>` : ''}
            <div class="total-row"><span>TOTAL ESTIMATE:</span><span>$${grandTotal.toFixed(2)}</span></div>
          </div>

          <div class="footer">
            <p><strong>Thank you for considering A-Frame Painting!</strong></p>
            <p>This estimate is valid for 30 days from the date above.</p>
            <p>Contact us with any questions or to schedule your project.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const generatePDF = async (sendEmail = false) => {
    try {
      const htmlContent = generateProfessionalHTML();
      
      // Create a temporary iframe for rendering
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '800px';
      iframe.style.height = '1000px';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Unable to access iframe document');
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Wait for fonts and images to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate PDF using html2canvas
      const canvas = await html2canvas(iframeDoc.body, {
        backgroundColor: '#1A1A1A',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 800,
        height: iframeDoc.body.scrollHeight
      });

      // Clean up iframe
      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      if (sendEmail) {
        const pdfDataUri = pdf.output('datauristring');
        emailMutation.mutate(pdfDataUri);
      } else {
        const timestamp = new Date().toISOString().slice(0, 10);
        pdf.save(`estimate-${project.clientName?.replace(/\s+/g, '-') || 'client'}-${timestamp}.pdf`);
        toast({
          title: "Success",
          description: "PDF downloaded successfully!"
        });
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const updatePaintCosts = (field: string, value: string) => {
    setPaintCosts((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const updateTravelCosts = (field: string, value: string) => {
    setTravelCosts((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateSelect = (date: string) => {
    setEstimateDate(date);
    setShowCalendar(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-[#8B5FBF]">
              Generate Estimate
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 p-6">
            {/* Estimate Details Section */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => toggleSection('estimateDetails')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#569CD6] text-lg">Estimate Information</CardTitle>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedSections.estimateDetails ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
              {expandedSections.estimateDetails && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Project Title/Description</label>
                      <Textarea
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                        placeholder="Brief description of the painting project..."
                        className="bg-gray-700 border-gray-600 text-white min-h-[80px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Estimate Date</label>
                      <div className="relative">
                        <Input
                          type="date"
                          value={estimateDate}
                          onChange={(e) => setEstimateDate(e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                        <Button
                          type="button"
                          onClick={() => setShowCalendar(true)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 bg-[#8B5FBF] hover:bg-[#8B5FBF]/80"
                        >
                          <Calendar className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Services & Labor Section */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => toggleSection('servicesLabor')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#E53E3E] text-lg">Services & Labor</CardTitle>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedSections.servicesLabor ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
              {expandedSections.servicesLabor && (
                <CardContent className="space-y-4">
                  {workStages.map((stage, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-750 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium mb-2">Service</label>
                        <Input
                          value={stage.name}
                          onChange={(e) => updateWorkStage(index, 'name', e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Hours</label>
                        <Input
                          type="number"
                          step="0.5"
                          value={stage.hours}
                          onChange={(e) => updateWorkStage(index, 'hours', e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Rate/Hour</label>
                        <Input
                          type="number"
                          value={stage.rate}
                          onChange={(e) => updateWorkStage(index, 'rate', e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Total</label>
                        <div className="text-[#6A9955] font-semibold text-lg">
                          ${((parseFloat(stage.hours) || 0) * (parseFloat(stage.rate.toString()) || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-right">
                    <div className="text-lg font-semibold text-[#E53E3E]">
                      Services Total: ${laborSubtotal.toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Additional Labor Section */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => toggleSection('additionalLabor')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#E53E3E] text-lg">Additional Labor/Crew</CardTitle>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedSections.additionalLabor ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
              {expandedSections.additionalLabor && (
                <CardContent className="space-y-4">
                  {additionalLabor.map((labor, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-750 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium mb-2">Worker Name</label>
                        <Input
                          value={labor.name}
                          onChange={(e) => updateAdditionalLabor(index, 'name', e.target.value)}
                          placeholder="e.g., Assistant, Helper"
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Hours</label>
                        <Input
                          type="number"
                          step="0.5"
                          value={labor.hours}
                          onChange={(e) => updateAdditionalLabor(index, 'hours', e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Rate/Hour</label>
                        <Input
                          type="number"
                          value={labor.rate}
                          onChange={(e) => updateAdditionalLabor(index, 'rate', e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div className="flex items-end space-x-2">
                        <div>
                          <label className="block text-sm font-medium mb-2">Total</label>
                          <div className="text-[#6A9955] font-semibold text-lg">
                            ${((parseFloat(labor.hours) || 0) * (parseFloat(labor.rate.toString()) || 0)).toFixed(2)}
                          </div>
                        </div>
                        <Button
                          onClick={() => removeLabor(index)}
                          variant="destructive"
                          size="sm"
                          disabled={additionalLabor.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center">
                    <Button
                      onClick={addLabor}
                      className="bg-[#E53E3E] hover:bg-[#E53E3E]/80"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Worker
                    </Button>
                    <div className="text-lg font-semibold text-[#E53E3E]">
                      Additional Labor Total: ${additionalLaborSubtotal.toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Paint & Materials Section */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => toggleSection('paintMaterials')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#D4AC0D] text-lg">Paint & Materials</CardTitle>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedSections.paintMaterials ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
              {expandedSections.paintMaterials && (
                <CardContent className="space-y-4">
                  {/* Paint Costs */}
                  <div className="p-4 bg-gray-750 rounded-lg">
                    <h4 className="text-[#D4AC0D] font-semibold mb-3">Paint</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Price per Gallon</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={paintCosts.pricePerGallon}
                          onChange={(e) => updatePaintCosts('pricePerGallon', e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Gallons Needed</label>
                        <Input
                          type="number"
                          step="0.5"
                          value={paintCosts.gallons}
                          onChange={(e) => updatePaintCosts('gallons', e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Number of Coats</label>
                        <Select value={paintCosts.coats} onValueChange={(value) => updatePaintCosts('coats', value)}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            <SelectItem value="1">1 Coat</SelectItem>
                            <SelectItem value="2">2 Coats</SelectItem>
                            <SelectItem value="3">3 Coats</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Paint Total</label>
                        <div className="text-[#6A9955] font-semibold text-lg">
                          ${paintSubtotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom Supplies */}
                  <div className="p-4 bg-gray-750 rounded-lg">
                    <h4 className="text-[#D4AC0D] font-semibold mb-3">Additional Supplies</h4>
                    {customSupplies.map((supply, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Item Name</label>
                          <Input
                            value={supply.name}
                            onChange={(e) => updateCustomSupply(index, 'name', e.target.value)}
                            placeholder="e.g., Brushes, Rollers"
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Quantity</label>
                          <Input
                            type="number"
                            value={supply.quantity}
                            onChange={(e) => updateCustomSupply(index, 'quantity', e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Price per Unit</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={supply.pricePerUnit}
                            onChange={(e) => updateCustomSupply(index, 'pricePerUnit', e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </div>
                        <div className="flex items-end space-x-2">
                          <div>
                            <label className="block text-sm font-medium mb-2">Total</label>
                            <div className="text-[#6A9955] font-semibold text-lg">
                              ${((parseFloat(supply.quantity) || 0) * (parseFloat(supply.pricePerUnit) || 0)).toFixed(2)}
                            </div>
                          </div>
                          <Button
                            onClick={() => removeCustomSupply(index)}
                            variant="destructive"
                            size="sm"
                            disabled={customSupplies.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      onClick={addCustomSupply}
                      className="bg-[#D4AC0D] hover:bg-[#D4AC0D]/80"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Supply
                    </Button>
                  </div>

                  {/* Material Markup */}
                  <div className="p-4 bg-gray-750 rounded-lg">
                    <div className="flex items-center space-x-4 mb-3">
                      <input
                        type="checkbox"
                        id="materialMarkup"
                        checked={materialMarkupEnabled}
                        onChange={(e) => setMaterialMarkupEnabled(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="materialMarkup" className="text-sm font-medium">Add Material Markup</label>
                    </div>
                    {materialMarkupEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Markup Percentage</label>
                          <Input
                            type="number"
                            step="1"
                            value={materialMarkupPercentage}
                            onChange={(e) => setMaterialMarkupPercentage(e.target.value)}
                            placeholder="e.g., 15"
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Markup Amount</label>
                          <div className="text-[#6A9955] font-semibold text-lg">
                            ${materialMarkupEnabled && materialMarkupPercentage ? 
                              (paintAndMaterialsSubtotal - (paintSubtotal + customSuppliesSubtotal)).toFixed(2) : 
                              '0.00'
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-semibold text-[#D4AC0D]">
                      Materials Total: ${paintAndMaterialsSubtotal.toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Additional Services Section */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => toggleSection('additionalServices')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#E53E3E] text-lg">Additional Services</CardTitle>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedSections.additionalServices ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
              {expandedSections.additionalServices && (
                <CardContent className="space-y-4">
                  {additionalServices.map((service, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-750 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium mb-2">Service</label>
                        <Input
                          value={service.name}
                          onChange={(e) => updateAdditionalService(index, 'name', e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Hours</label>
                        <Input
                          type="number"
                          step="0.5"
                          value={service.hours}
                          onChange={(e) => updateAdditionalService(index, 'hours', e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Rate/Hour</label>
                        <Input
                          type="number"
                          value={service.rate}
                          onChange={(e) => updateAdditionalService(index, 'rate', e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div className="flex items-end space-x-2">
                        <div>
                          <label className="block text-sm font-medium mb-2">Total</label>
                          <div className="text-[#6A9955] font-semibold text-lg">
                            ${((parseFloat(service.hours) || 0) * (parseFloat(service.rate.toString()) || 0)).toFixed(2)}
                          </div>
                        </div>
                        {index >= 3 && (
                          <Button
                            onClick={() => removeAdditionalService(index)}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center">
                    <Button
                      onClick={addAdditionalService}
                      className="bg-[#E53E3E] hover:bg-[#E53E3E]/80"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service
                    </Button>
                    <div className="text-lg font-semibold text-[#E53E3E]">
                      Additional Services Total: ${additionalServicesSubtotal.toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Travel Costs Section */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => toggleSection('travel')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#6A9955] text-lg">Travel Costs</CardTitle>
                  <ChevronDown className={`w-5 h-5 transition-transform ${expandedSections.travel ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
              {expandedSections.travel && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-750 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium mb-2">Distance (km)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={travelCosts.distance}
                        onChange={(e) => updateTravelCosts('distance', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Number of Trips</label>
                      <Input
                        type="number"
                        value={travelCosts.trips}
                        onChange={(e) => updateTravelCosts('trips', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Rate per km</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={travelCosts.ratePerKm}
                        onChange={(e) => updateTravelCosts('ratePerKm', e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Travel Total</label>
                      <div className="text-[#6A9955] font-semibold text-lg">
                        ${travelSubtotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Summary */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-[#8B5FBF] text-lg">Estimate Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {laborSubtotal > 0 && (
                  <div className="flex justify-between text-[#E53E3E]">
                    <span>Services & Labor:</span>
                    <span>${laborSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {additionalLaborSubtotal > 0 && (
                  <div className="flex justify-between text-[#E53E3E]">
                    <span>Additional Labor:</span>
                    <span>${additionalLaborSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {additionalServicesSubtotal > 0 && (
                  <div className="flex justify-between text-[#E53E3E]">
                    <span>Additional Services:</span>
                    <span>${additionalServicesSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {paintAndMaterialsSubtotal > 0 && (
                  <div className="flex justify-between text-[#D4AC0D]">
                    <span>Paint & Materials:</span>
                    <span>${paintAndMaterialsSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {travelSubtotal > 0 && (
                  <div className="flex justify-between text-[#6A9955]">
                    <span>Travel Costs:</span>
                    <span>${travelSubtotal.toFixed(2)}</span>
                  </div>
                )}
                <hr className="border-gray-600" />
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotalBeforeTax.toFixed(2)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({(taxRate * 100).toFixed(1)}%):</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <hr className="border-gray-600" />
                <div className="flex justify-between text-2xl font-bold text-[#8B5FBF]">
                  <span>TOTAL ESTIMATE:</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4">
              <Button 
                onClick={onClose}
                variant="outline" 
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              
              <div className="flex gap-3">
                <Button 
                  onClick={() => generatePDF(false)}
                  className="bg-[#8B5FBF] hover:bg-[#8B5FBF]/80 text-white"
                  disabled={grandTotal === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  onClick={() => generatePDF(true)}
                  className="bg-[#E53E3E] hover:bg-[#E53E3E]/80 text-white"
                  disabled={emailMutation.isPending || !project.clientEmail || grandTotal === 0}
                >
                  {emailMutation.isPending ? (
                    'Sending...'
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Email PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Modal */}
      {showCalendar && (
        <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-[#8B5FBF]">Select Estimate Date</DialogTitle>
            </DialogHeader>
            <PaintBrainCalendar 
              onDateSelect={handleDateSelect}
              selectedDate={estimateDate}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}