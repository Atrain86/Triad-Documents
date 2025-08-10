import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Download, Mail, Plus, Trash2, Calendar, ChevronDown, ChevronLeft, Users, Settings, X, Wrench } from 'lucide-react';
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

  // Work stages state - dynamically set based on current mode
  const [workStages, setWorkStages] = useState(() => {
    const mode = localStorage.getItem('estimateServicesMode') || 'default';
    if (mode === 'default') {
      const saved = localStorage.getItem('estimateDefaultServices');
      return saved ? JSON.parse(saved) : [
        { name: 'Prep', hours: '', rate: 60 },
        { name: 'Priming', hours: '', rate: 60 },
        { name: 'Painting', hours: '', rate: 60 },
      ];
    } else {
      const saved = localStorage.getItem('estimateCustomServices');
      return saved ? JSON.parse(saved) : [
        { name: 'Prep', hours: '', rate: 60 },
        { name: 'Priming', hours: '', rate: 60 },
        { name: 'Painting', hours: '', rate: 60 },
      ];
    }
  });

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

  // Toggle states for workers and services mode with localStorage persistence
  const [workersMode, setWorkersMode] = useState<'default' | 'custom'>(() => {
    const saved = localStorage.getItem('estimateWorkersMode');
    return (saved as 'default' | 'custom') || 'default';
  });
  const [servicesMode, setServicesMode] = useState<'default' | 'custom'>(() => {
    const saved = localStorage.getItem('estimateServicesMode');
    return (saved as 'default' | 'custom') || 'default';
  });

  // Separate state for default and custom configurations
  const [defaultServices, setDefaultServices] = useState(() => {
    const saved = localStorage.getItem('estimateDefaultServices');
    return saved ? JSON.parse(saved) : [
      { name: 'Prep', hours: '', rate: 60 },
      { name: 'Priming', hours: '', rate: 60 },
      { name: 'Painting', hours: '', rate: 60 },
    ];
  });
  const [customServices, setCustomServices] = useState(() => {
    const saved = localStorage.getItem('estimateCustomServices');
    return saved ? JSON.parse(saved) : [
      { name: 'Prep', hours: '', rate: 60 },
      { name: 'Priming', hours: '', rate: 60 },
      { name: 'Painting', hours: '', rate: 60 },
    ];
  });

  const [defaultWorkers, setDefaultWorkers] = useState(() => {
    const saved = localStorage.getItem('estimateDefaultWorkers');
    return saved ? JSON.parse(saved) : [{ name: '', hours: '', rate: 0 }];
  });
  const [customWorkers, setCustomWorkers] = useState(() => {
    const saved = localStorage.getItem('estimateCustomWorkers');
    return saved ? JSON.parse(saved) : [{ name: '', hours: '', rate: 60 }];
  });

  // Additional labor (crew members) - dynamically set based on current mode
  const [additionalLabor, setAdditionalLabor] = useState(() => {
    const mode = localStorage.getItem('estimateWorkersMode') || 'default';
    if (mode === 'default') {
      const saved = localStorage.getItem('estimateDefaultWorkers');
      return saved ? JSON.parse(saved) : [{ name: '', hours: '', rate: 0 }];
    } else {
      const saved = localStorage.getItem('estimateCustomWorkers');
      return saved ? JSON.parse(saved) : [{ name: '', hours: '', rate: 60 }];
    }
  });

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
    setWorkStages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const updateAdditionalService = useCallback((index: number, field: string, value: string) => {
    setAdditionalServices((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const updateAdditionalLabor = useCallback((index: number, field: string, value: string) => {
    setAdditionalLabor((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const addLabor = useCallback(() => {
    const defaultRate = workersMode === 'default' ? 0 : 60;
    setAdditionalLabor((prev) => [...prev, { name: '', hours: '', rate: defaultRate }]);
  }, [workersMode]);

  // Auto-save effects to continuously save changes
  useEffect(() => {
    if (servicesMode === 'default') {
      localStorage.setItem('estimateDefaultServices', JSON.stringify(workStages));
      setDefaultServices(workStages);
    } else {
      localStorage.setItem('estimateCustomServices', JSON.stringify(workStages));
      setCustomServices(workStages);
    }
  }, [workStages, servicesMode]);

  useEffect(() => {
    if (workersMode === 'default') {
      localStorage.setItem('estimateDefaultWorkers', JSON.stringify(additionalLabor));
      setDefaultWorkers(additionalLabor);
    } else {
      localStorage.setItem('estimateCustomWorkers', JSON.stringify(additionalLabor));
      setCustomWorkers(additionalLabor);
    }
  }, [additionalLabor, workersMode]);

  const updateCustomSupply = useCallback((index: number, field: string, value: string) => {
    setCustomSupplies((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const addCustomSupply = useCallback(() => {
    setCustomSupplies((prev) => [...prev, { name: '', quantity: '', pricePerUnit: '' }]);
  }, []);

  const removeCustomSupply = useCallback((index: number) => {
    setCustomSupplies((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  }, []);

  const removeLabor = useCallback((index: number) => {
    setAdditionalLabor((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addAdditionalService = useCallback(() => {
    const defaultRate = servicesMode === 'default' ? 0 : 60;
    setAdditionalServices(prev => [...prev, { name: '', hours: '', rate: defaultRate }]);
  }, [servicesMode]);

  // Toggle handlers with localStorage persistence and state switching
  const handleWorkersModeToggle = useCallback(() => {
    setWorkersMode(prev => {
      const newMode = prev === 'default' ? 'custom' : 'default';
      
      // Save current workers state to the current mode
      if (prev === 'default') {
        localStorage.setItem('estimateDefaultWorkers', JSON.stringify(additionalLabor));
        setDefaultWorkers(additionalLabor);
      } else {
        localStorage.setItem('estimateCustomWorkers', JSON.stringify(additionalLabor));
        setCustomWorkers(additionalLabor);
      }
      
      // Load workers state for the new mode
      if (newMode === 'default') {
        const savedDefault = localStorage.getItem('estimateDefaultWorkers');
        const defaultData = savedDefault ? JSON.parse(savedDefault) : [{ name: '', hours: '', rate: 0 }];
        setAdditionalLabor(defaultData);
      } else {
        const savedCustom = localStorage.getItem('estimateCustomWorkers');
        const customData = savedCustom ? JSON.parse(savedCustom) : [{ name: '', hours: '', rate: 60 }];
        setAdditionalLabor(customData);
      }
      
      localStorage.setItem('estimateWorkersMode', newMode);
      return newMode;
    });
  }, [additionalLabor]);

  const handleServicesModeToggle = useCallback(() => {
    setServicesMode(prev => {
      const newMode = prev === 'default' ? 'custom' : 'default';
      
      // Save current services state to the current mode
      if (prev === 'default') {
        localStorage.setItem('estimateDefaultServices', JSON.stringify(workStages));
        setDefaultServices(workStages);
      } else {
        localStorage.setItem('estimateCustomServices', JSON.stringify(workStages));
        setCustomServices(workStages);
      }
      
      // Load services state for the new mode
      if (newMode === 'default') {
        const savedDefault = localStorage.getItem('estimateDefaultServices');
        const defaultData = savedDefault ? JSON.parse(savedDefault) : [
          { name: 'Prep', hours: '', rate: 60 },
          { name: 'Priming', hours: '', rate: 60 },
          { name: 'Painting', hours: '', rate: 60 },
        ];
        setWorkStages(defaultData);
      } else {
        const savedCustom = localStorage.getItem('estimateCustomServices');
        const customData = savedCustom ? JSON.parse(savedCustom) : [
          { name: 'Prep', hours: '', rate: 60 },
          { name: 'Priming', hours: '', rate: 60 },
          { name: 'Painting', hours: '', rate: 60 },
        ];
        setWorkStages(customData);
      }
      
      localStorage.setItem('estimateServicesMode', newMode);
      return newMode;
    });
  }, [workStages]);

  const removeAdditionalService = useCallback((index: number) => {
    if (index >= 3) {
      setAdditionalServices(prev => prev.filter((_, i) => i !== index));
    }
  }, []);

  // Calculate totals
  const laborSubtotal = workStages.reduce((sum: number, stage: any) => {
    const hours = parseFloat(stage.hours) || 0;
    const rate = servicesMode === 'default' ? 0 : (parseFloat(stage.rate.toString()) || 0);
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
      const rate = workersMode === 'default' ? 0 : (parseFloat(member.rate.toString()) || 0);
      return sum + (hours * rate);
    }, 0);
  }, [additionalLabor, workersMode]);

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
    setPaintCosts((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const updateTravelCosts = (field: string, value: string) => {
    setTravelCosts((prev) => ({
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
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden bg-gray-900 border-gray-700 text-white">
          <DialogHeader className="sr-only">
            <DialogTitle>Generate Estimate</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col w-full overflow-x-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-700 bg-gray-800">
              <div></div> {/* Spacer for centering */}
              <div className="text-center">
                <h1 className="text-2xl font-bold text-[#8B5FBF]">Generate Estimate</h1>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="px-8 py-6 space-y-6 w-full overflow-x-hidden bg-gray-900">
            {/* Estimate Details Section */}
            <div className="border-2 border-[#E53E3E] rounded-lg p-2 sm:p-4 bg-gray-800/50">
              <h3 className="text-[#E53E3E] text-lg font-semibold mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Estimate Information
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Project Title</label>
                    <Input
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      placeholder=""
                      className="bg-gray-800 border-[#E53E3E] text-white focus:border-[#E53E3E] focus:ring-[#E53E3E]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Estimate Date</label>
                    <div className="relative">
                      <Input
                        type="date"
                        value={estimateDate}
                        onChange={(e) => setEstimateDate(e.target.value)}
                        className="bg-gray-800 border-[#E53E3E] text-white focus:border-[#E53E3E] focus:ring-[#E53E3E]"
                      />
                      <Button
                        type="button"
                        onClick={() => setShowCalendar(true)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 bg-[#E53E3E] hover:bg-[#E53E3E]/80"
                      >
                        <Calendar className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Services & Labor Section */}
            <div className="border-2 border-[#569CD6] rounded-lg bg-gray-800/50 min-w-0">
              <div 
                className="flex items-center justify-between cursor-pointer p-3"
                onClick={() => toggleSection('servicesLabor')}
              >
                <h3 className="text-[#569CD6] text-lg font-semibold">Services & Labor</h3>
                <ChevronDown className={`w-5 h-5 text-[#569CD6] transition-transform ${expandedSections.servicesLabor ? 'rotate-180' : ''}`} />
              </div>
              {expandedSections.servicesLabor && (
                <div className="space-y-4 p-2 sm:p-4 border-t border-[#569CD6]/30 min-w-0">
                  {/* Primary Services */}
                  <div className="border rounded-lg p-2 space-y-4" style={{ borderColor: '#569CD6', backgroundColor: '#569CD610' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold flex items-center" style={{ color: '#569CD6' }}>
                          <Wrench className="mr-2 h-4 w-4" />
                          Services
                        </h3>
                        <Button
                          onClick={() => setWorkStages((prev: any) => [...prev, { name: '', hours: '', rate: 0 }])}
                          className="text-blue-400 bg-transparent hover:bg-blue-400/20 p-2"
                          variant="ghost"
                          style={{ minWidth: '38px', minHeight: '38px' }}
                        >
                          <Plus style={{ width: '38px', height: '38px' }} strokeWidth={2} />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${servicesMode === 'default' ? 'text-blue-400' : 'text-gray-500'}`}>
                          Default
                        </span>
                        <button
                            onClick={handleServicesModeToggle}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${
                              servicesMode === 'custom' ? 'bg-yellow-600' : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                servicesMode === 'custom' ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        <span className={`text-xs font-medium ${servicesMode === 'custom' ? 'text-yellow-400' : 'text-gray-500'}`}>
                          Custom
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {workStages.map((stage, index) => (
                        <div key={index} className="flex flex-wrap gap-2 items-end">
                          <div className="flex-1 min-w-0">
                            <label className="block text-xs font-medium mb-1 text-gray-300">Service</label>
                            <Input
                              value={stage.name}
                              onChange={(e) => updateWorkStage(index, 'name', e.target.value)}
                              placeholder="Service name"
                              className="bg-gray-800 border-[#569CD6] text-white focus:border-[#569CD6] focus:ring-[#569CD6] w-full"
                            />
                          </div>
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium mb-1 text-gray-300 text-center">Hours</label>
                            <Input
                              type="number"
                              step="0.25"
                              value={stage.hours}
                              onChange={(e) => updateWorkStage(index, 'hours', e.target.value)}
                              placeholder="0"
                              min="0"
                              max="999"
                              className="bg-gray-800 border-[#569CD6] text-white focus:border-[#569CD6] focus:ring-[#569CD6] text-center w-16 placeholder:text-gray-500"
                            />
                          </div>
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium mb-1 text-gray-300 text-center">Rate</label>
                            <Input
                              type="number"
                              value={stage.rate}
                              onChange={(e) => updateWorkStage(index, 'rate', e.target.value)}
                              placeholder="0"
                              min="0"
                              max="999"
                              step="1"
                              className="bg-gray-800 border-[#569CD6] text-white focus:border-[#569CD6] focus:ring-[#569CD6] text-center w-14 placeholder:text-gray-500"
                            />
                          </div>
                          <Button
                            onClick={() => {
                              setWorkStages((prev) => prev.filter((_, i) => i !== index));
                            }}
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <div className="pt-3 border-t border-[#569CD6]/30">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-green-400">Services Subtotal:</span>
                          <span className="font-bold text-green-400">${laborSubtotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Labor/Crew */}
                  <div className="border rounded-lg p-2 space-y-4" style={{ borderColor: '#569CD6', backgroundColor: '#569CD610' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold flex items-center" style={{ color: '#569CD6' }}>
                          <Users className="mr-2 h-4 w-4" />
                          Crew
                        </h3>
                        <Button
                          onClick={addLabor}
                          className="text-blue-400 bg-transparent hover:bg-blue-400/20 p-2"
                          variant="ghost"
                          style={{ minWidth: '38px', minHeight: '38px' }}
                        >
                          <Plus style={{ width: '38px', height: '38px' }} strokeWidth={2} />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${workersMode === 'default' ? 'text-blue-400' : 'text-gray-500'}`}>
                            Default
                          </span>
                          <button
                            onClick={handleWorkersModeToggle}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${
                              workersMode === 'custom' ? 'bg-yellow-600' : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                workersMode === 'custom' ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className={`text-xs font-medium ${workersMode === 'custom' ? 'text-yellow-400' : 'text-gray-500'}`}>
                            Custom
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {additionalLabor.map((labor, index) => (
                        <div key={index} className="flex flex-wrap gap-2 items-end">
                          <div className="flex-1 min-w-0">
                            <label className="block text-xs font-medium mb-1 text-gray-300">Name</label>
                            <Input
                              value={labor.name}
                              onChange={(e) => updateAdditionalLabor(index, 'name', e.target.value)}
                              placeholder="Employee name"
                              className="bg-gray-800 border-[#569CD6] text-white focus:border-[#569CD6] focus:ring-[#569CD6] w-full"
                            />
                          </div>
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium mb-1 text-gray-300 text-center">Hours</label>
                            <Input
                              type="number"
                              step="0.25"
                              value={labor.hours}
                              onChange={(e) => updateAdditionalLabor(index, 'hours', e.target.value)}
                              placeholder="0"
                              min="0"
                              max="999"
                              className="bg-gray-800 border-[#569CD6] text-white focus:border-[#569CD6] focus:ring-[#569CD6] text-center w-16 placeholder:text-gray-500"
                            />
                          </div>
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium mb-1 text-gray-300 text-center">Rate</label>
                            <Input
                              type="number"
                              value={labor.rate}
                              onChange={(e) => updateAdditionalLabor(index, 'rate', e.target.value)}
                              placeholder="0"
                              min="0"
                              max="999"
                              step="1"
                              className="bg-gray-800 border-[#569CD6] text-white focus:border-[#569CD6] focus:ring-[#569CD6] text-center w-14 placeholder:text-gray-500"
                            />
                          </div>
                          <Button
                            onClick={() => removeLabor(index)}
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <div className="pt-3 border-t border-[#569CD6]/30">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-green-400">Crew Subtotal:</span>
                          <span className="font-bold text-green-400">${additionalLaborSubtotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Total */}
                  <div className="text-right">
                    <div className="text-lg font-semibold text-green-400 bg-gray-900/50 border border-green-400 rounded px-4 py-2 flex justify-between items-center w-full sm:inline-block sm:min-w-[300px]">
                      <span>Services & Crew Total</span>
                      <span>${(laborSubtotal + additionalLaborSubtotal).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>



            {/* Paint & Materials Section */}
            <div className="border-2 border-[#D4AC0D] rounded-lg bg-gray-800/50">
              <div 
                className="flex items-center justify-between cursor-pointer p-3"
                onClick={() => toggleSection('paintMaterials')}
              >
                <h3 className="text-[#D4AC0D] text-lg font-semibold">Paint & Materials</h3>
                <ChevronDown className={`w-5 h-5 text-[#D4AC0D] transition-transform ${expandedSections.paintMaterials ? 'rotate-180' : ''}`} />
              </div>
              {expandedSections.paintMaterials && (
                <div className="space-y-4 p-4 border-t border-[#D4AC0D]/30">
                  {/* Paint Costs */}
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-[#D4AC0D]/30">
                    <h4 className="text-[#D4AC0D] font-semibold mb-3">Paint</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Price per Gallon</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={paintCosts.pricePerGallon}
                          onChange={(e) => updatePaintCosts('pricePerGallon', e.target.value)}
                          className="bg-gray-800 border-[#D4AC0D] text-white focus:border-[#D4AC0D] focus:ring-[#D4AC0D]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Gallons Needed</label>
                        <Input
                          type="number"
                          step="0.5"
                          value={paintCosts.gallons}
                          onChange={(e) => updatePaintCosts('gallons', e.target.value)}
                          className="bg-gray-800 border-[#D4AC0D] text-white focus:border-[#D4AC0D] focus:ring-[#D4AC0D]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Number of Coats</label>
                        <Select value={paintCosts.coats} onValueChange={(value) => updatePaintCosts('coats', value)}>
                          <SelectTrigger className="bg-gray-800 border-[#D4AC0D] text-white focus:border-[#D4AC0D] focus:ring-[#D4AC0D]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-[#D4AC0D]">
                            <SelectItem value="1">1 Coat</SelectItem>
                            <SelectItem value="2">2 Coats</SelectItem>
                            <SelectItem value="3">3 Coats</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-300">Paint Total</label>
                        <div className="text-[#D4AC0D] font-semibold text-lg bg-gray-800 border border-[#D4AC0D]/30 rounded px-3 py-2">
                          ${paintSubtotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom Supplies */}
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-[#D4AC0D]/30">
                    <h4 className="text-[#D4AC0D] font-semibold mb-3">Additional Supplies</h4>
                    {customSupplies.map((supply, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-300">Item Name</label>
                          <Input
                            value={supply.name}
                            onChange={(e) => updateCustomSupply(index, 'name', e.target.value)}
                            placeholder="e.g., Brushes, Rollers"
                            className="bg-gray-800 border-[#D4AC0D] text-white focus:border-[#D4AC0D] focus:ring-[#D4AC0D]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-300">Quantity</label>
                          <Input
                            type="number"
                            value={supply.quantity}
                            onChange={(e) => updateCustomSupply(index, 'quantity', e.target.value)}
                            className="bg-gray-800 border-[#D4AC0D] text-white focus:border-[#D4AC0D] focus:ring-[#D4AC0D]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-300">Price per Unit</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={supply.pricePerUnit}
                            onChange={(e) => updateCustomSupply(index, 'pricePerUnit', e.target.value)}
                            className="bg-gray-800 border-[#D4AC0D] text-white focus:border-[#D4AC0D] focus:ring-[#D4AC0D]"
                          />
                        </div>
                        <div className="flex items-end space-x-2">
                          <div className="flex-1">
                            <label className="block text-sm font-medium mb-2 text-gray-300">Total</label>
                            <div className="text-[#D4AC0D] font-semibold text-lg bg-gray-800 border border-[#D4AC0D]/30 rounded px-3 py-2">
                              ${((parseFloat(supply.quantity) || 0) * (parseFloat(supply.pricePerUnit) || 0)).toFixed(2)}
                            </div>
                          </div>
                          <Button
                            onClick={() => removeCustomSupply(index)}
                            variant="destructive"
                            size="sm"
                            disabled={customSupplies.length === 1}
                            className="bg-red-600 hover:bg-red-700 border-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      onClick={addCustomSupply}
                      className="bg-[#D4AC0D] hover:bg-[#D4AC0D]/80 border-[#D4AC0D] text-black"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Supply
                    </Button>
                  </div>

                  {/* Material Markup */}
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-[#D4AC0D]/30">
                    <div className="flex items-center space-x-4 mb-3">
                      <input
                        type="checkbox"
                        id="materialMarkup"
                        checked={materialMarkupEnabled}
                        onChange={(e) => setMaterialMarkupEnabled(e.target.checked)}
                        className="w-4 h-4 accent-[#D4AC0D]"
                      />
                      <label htmlFor="materialMarkup" className="text-sm font-medium text-gray-300">Add Material Markup</label>
                    </div>
                    {materialMarkupEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-300">Markup Percentage</label>
                          <Input
                            type="number"
                            step="1"
                            value={materialMarkupPercentage}
                            onChange={(e) => setMaterialMarkupPercentage(e.target.value)}
                            placeholder="e.g., 15"
                            className="bg-gray-800 border-[#D4AC0D] text-white focus:border-[#D4AC0D] focus:ring-[#D4AC0D]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-300">Markup Amount</label>
                          <div className="text-[#D4AC0D] font-semibold text-lg bg-gray-800 border border-[#D4AC0D]/30 rounded px-3 py-2">
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
                    <div className="text-lg font-semibold text-[#D4AC0D] bg-gray-900/50 border border-[#D4AC0D] rounded px-4 py-2 inline-block">
                      Materials Total: ${paintAndMaterialsSubtotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>



            {/* Travel Costs Section */}
            <div className="border-2 border-[#6A9955] rounded-lg bg-gray-800/50">
              <div 
                className="flex items-center justify-between cursor-pointer p-3"
                onClick={() => toggleSection('travel')}
              >
                <h3 className="text-[#6A9955] text-lg font-semibold">Travel Costs</h3>
                <ChevronDown className={`w-5 h-5 text-[#6A9955] transition-transform ${expandedSections.travel ? 'rotate-180' : ''}`} />
              </div>
              {expandedSections.travel && (
                <div className="space-y-4 p-4 border-t border-[#6A9955]/30">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-900/50 rounded-lg border border-[#6A9955]/30">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">Distance (km)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={travelCosts.distance}
                        onChange={(e) => updateTravelCosts('distance', e.target.value)}
                        className="bg-gray-800 border-[#6A9955] text-white focus:border-[#6A9955] focus:ring-[#6A9955]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">Number of Trips</label>
                      <Input
                        type="number"
                        value={travelCosts.trips}
                        onChange={(e) => updateTravelCosts('trips', e.target.value)}
                        className="bg-gray-800 border-[#6A9955] text-white focus:border-[#6A9955] focus:ring-[#6A9955]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">Rate per km</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={travelCosts.ratePerKm}
                        onChange={(e) => updateTravelCosts('ratePerKm', e.target.value)}
                        className="bg-gray-800 border-[#6A9955] text-white focus:border-[#6A9955] focus:ring-[#6A9955]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">Travel Total</label>
                      <div className="text-[#6A9955] font-semibold text-lg bg-gray-800 border border-[#6A9955]/30 rounded px-3 py-2">
                        ${travelSubtotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="border-2 border-[#8B5FBF] rounded-lg p-4 bg-gray-800/50">
              <h3 className="text-[#8B5FBF] text-lg font-semibold mb-3">Estimate Summary</h3>
              <div className="space-y-3">
                {laborSubtotal > 0 && (
                  <div className="flex justify-between text-[#569CD6] bg-gray-900/50 border border-[#569CD6]/30 rounded px-3 py-2">
                    <span>Services & Labor</span>
                    <span>${laborSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {additionalLaborSubtotal > 0 && (
                  <div className="flex justify-between text-[#569CD6] bg-gray-900/50 border border-[#569CD6]/30 rounded px-3 py-2">
                    <span>Additional Labor</span>
                    <span>${additionalLaborSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {additionalServicesSubtotal > 0 && (
                  <div className="flex justify-between text-[#D4AC0D] bg-gray-900/50 border border-[#D4AC0D]/30 rounded px-3 py-2">
                    <span>Additional Services</span>
                    <span>${additionalServicesSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {paintAndMaterialsSubtotal > 0 && (
                  <div className="flex justify-between text-[#D4AC0D] bg-gray-900/50 border border-[#D4AC0D]/30 rounded px-3 py-2">
                    <span>Paint & Materials</span>
                    <span>${paintAndMaterialsSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {travelSubtotal > 0 && (
                  <div className="flex justify-between text-[#6A9955] bg-gray-900/50 border border-[#6A9955]/30 rounded px-3 py-2">
                    <span>Travel Costs</span>
                    <span>${travelSubtotal.toFixed(2)}</span>
                  </div>
                )}
                <hr className="border-[#8B5FBF]" />
                <div className="flex justify-between bg-gray-900/50 border border-gray-600 rounded px-3 py-2">
                  <span>Subtotal</span>
                  <span>${subtotalBeforeTax.toFixed(2)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between bg-gray-900/50 border border-gray-600 rounded px-3 py-2">
                    <span>Tax ({(taxRate * 100).toFixed(1)}%):</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <hr className="border-[#8B5FBF]" />
                <div className="flex justify-between text-lg font-semibold text-green-400 bg-gray-900/50 border border-green-400 rounded px-4 py-2">
                  <span>Total Estimate:</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

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