import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, Mail } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Project {
  id: number;
  clientName: string;
  address: string;
  clientCity?: string;
  clientPostal?: string;
  clientEmail?: string;
  clientPhone?: string;
  projectType: string;
  roomCount: number;
  difficulty: string;
  hourlyRate: number;
  status: string;
  notes?: string;
  createdAt: string;
}

interface EstimateData {
  estimateNumber: string;
  date: string;
  projectTitle: string;
  clientName: string;
  prepWork: number;
  woodReconditioning: number;
  drywallRepair: number;
  paintSupplier: string;
  paintCost: number;
}

interface EstimateGeneratorProps {
  project: any;
  isOpen: boolean;
  onClose: () => void;
}

function EstimateGenerator({ project, isOpen, onClose }: EstimateGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const estimateRef = useRef<HTMLDivElement>(null);

  const [estimateData, setEstimateData] = useState<EstimateData>({
    estimateNumber: '',
    date: new Date().toLocaleDateString('en-CA'),
    projectTitle: '',
    clientName: project?.clientName || '',
    prepWork: 0,
    woodReconditioning: 0,
    drywallRepair: 0,
    paintSupplier: 'A-Frame',
    paintCost: 0,
  });

  useEffect(() => {
    if (project) {
      setEstimateData(prev => ({
        ...prev,
        clientName: project.clientName
      }));
    }
  }, [project]);

  // Calculate totals
  const laborSubtotal = (
    estimateData.prepWork +
    estimateData.woodReconditioning +
    estimateData.drywallRepair
  ) * 60;

  const paintCosts = estimateData.paintCost;
  const grandTotal = laborSubtotal + paintCosts;

  const generatePDF = async () => {
    if (!estimateRef.current) {
      toast({
        title: "Error",
        description: "Estimate preview not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      // Temporarily show the estimate preview element for capture
      const originalDisplay = estimateRef.current.style.display;
      const originalVisibility = estimateRef.current.style.visibility;
      
      estimateRef.current.style.display = 'block';
      estimateRef.current.style.visibility = 'visible';
      estimateRef.current.style.position = 'absolute';
      estimateRef.current.style.top = '-9999px';
      estimateRef.current.style.left = '-9999px';
      estimateRef.current.style.width = '794px'; // A4 width in pixels
      
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture the estimate preview
      const canvas = await html2canvas(estimateRef.current, {
        scale: 1,
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 794,
        height: estimateRef.current.scrollHeight
      });

      // Restore original styling
      estimateRef.current.style.display = originalDisplay;
      estimateRef.current.style.visibility = originalVisibility;
      estimateRef.current.style.position = '';
      estimateRef.current.style.top = '';
      estimateRef.current.style.left = '';
      estimateRef.current.style.width = '';

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit page
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Add main estimate page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);

      const filename = `Estimate-${estimateData.estimateNumber || 'EST-001'}-${project?.clientName || 'Client'}.pdf`;
      pdf.save(filename);
      
      toast({
        title: "PDF Generated!",
        description: `Estimate downloaded as ${filename}`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sendEstimateEmail = async () => {
    if (!estimateData.estimateNumber || !project?.clientEmail) {
      toast({
        title: "Missing Information",
        description: "Please fill in estimate number and ensure client has an email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSending(true);
      
      const response = await fetch('/api/send-estimate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: project.clientEmail,
          clientName: estimateData.clientName,
          estimateNumber: estimateData.estimateNumber,
          projectTitle: estimateData.projectTitle,
          grandTotal: grandTotal
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Email Sent Successfully",
          description: `Estimate sent to ${project.clientEmail}`,
        });
      } else {
        throw new Error(result.error || 'Failed to send email');
      }

    } catch (error) {
      console.error('Email sending failed:', error);
      toast({
        title: "Email Failed",
        description: "Could not send estimate email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const [supplies, setSupplies] = useState([
    { name: 'Tape', unitCost: '', quantity: '', total: 0 },
    { name: 'Brushes', unitCost: '', quantity: '', total: 0 },
    { name: 'Rollers', unitCost: '', quantity: '', total: 0 }
  ]);

  // Travel costs state
  const [travelCosts, setTravelCosts] = useState(storedData?.travelCosts || {
    ratePerKm: '0.50',
    distance: '',
    trips: '2'
  });

  // Additional Services state (Power Washing, Drywall Repair, Wood Reconditioning)
  const [additionalServices, setAdditionalServices] = useState(storedData?.additionalServices || [
    { name: 'Power Washing', enabled: false, hours: 0, rate: 60 },
    { name: 'Drywall Repair', enabled: false, hours: 0, rate: 60 },
    { name: 'Wood Reconditioning', enabled: false, hours: 0, rate: 60 }
  ]);

  // Additional labor state
  const [additionalLabor, setAdditionalLabor] = useState(storedData?.additionalLabor || [
    { name: '', hours: '', rate: '' }
  ]);

  // Tax configuration state
  const [taxConfig, setTaxConfig] = useState(storedData?.taxConfig || {
    country: 'CA',
    gst: 5,
    pst: 0,
    hst: 0,
    salesTax: 0,
    vat: 0,
    otherTax: 0
  });

  // Toggle state for action buttons
  const [actionMode, setActionMode] = useState<'download' | 'email' | 'pdf'>('email');
  
  // Loading state
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Additional missing state variables
  const [estimateDate, setEstimateDate] = useState(storedData?.estimateDate || new Date().toISOString().split('T')[0]);
  const [primerGallons, setPrimerGallons] = useState(storedData?.primerGallons || '');
  const [paintGallons, setPaintGallons] = useState(storedData?.paintGallons || '');
  const [paintCostPerGallon, setPaintCostPerGallon] = useState(storedData?.paintCostPerGallon || '');
  const [travelDistance, setTravelDistance] = useState(storedData?.travelDistance || '');
  const [travelRate, setTravelRate] = useState(storedData?.travelRate || '0.50');
  const [travelTrips, setTravelTrips] = useState(storedData?.travelTrips || '2');

  // Save form data to localStorage whenever any state changes
  useEffect(() => {
    const dataToSave = {
      estimateNumber,
      projectTitle,
      projectDescription,
      workStages,
      primerCosts,
      paintCosts,
      supplies,
      travelCosts,
      additionalServices,
      additionalLabor,
      taxConfig
    };
    saveEstimateData(dataToSave);
  }, [estimateNumber, projectTitle, projectDescription, workStages, primerCosts, paintCosts, supplies, travelCosts, additionalServices, additionalLabor, taxConfig]);

  // Handle input changes for work stages
  const updateWorkStage = (index: number, field: string, value: string | number) => {
    const newStages = [...workStages];
    newStages[index] = { ...newStages[index], [field]: value };
    setWorkStages(newStages);
  };

  // Add new work stage
  const addWorkStage = () => {
    setWorkStages([...workStages, { name: '', description: '', hours: '', rate: 60 }]);
  };

  // Add new supply item
  const addSupply = () => {
    setSupplies([...supplies, { name: '', unitCost: '', quantity: '', total: 0 }]);
  };

  // Remove supply item
  const removeSupply = (index: number) => {
    setSupplies(supplies.filter((_: any, i: number) => i !== index));
  };

  // Add new labor member
  const addLaborMember = () => {
    setAdditionalLabor([...additionalLabor, { name: '', hours: '', rate: '' }]);
  };

  // Remove labor member
  const removeLaborMember = (index: number) => {
    setAdditionalLabor(additionalLabor.filter((_: any, i: number) => i !== index));
  };

  // Update additional service
  const updateAdditionalService = (index: number, field: string, value: boolean | number) => {
    const newServices = [...additionalServices];
    if (field === 'enabled') {
      newServices[index].enabled = value as boolean;
      // Reset hours to 0 when disabled
      if (!value) {
        newServices[index].hours = 0;
      }
    } else if (field === 'hours') {
      // Ensure minimum of 0 and increment by 0.5
      const hours = Math.max(0, Math.round((value as number) * 2) / 2);
      newServices[index].hours = hours;
    }
    setAdditionalServices(newServices);
  };

  // Update labor member
  const updateLaborMember = (index: number, field: string, value: string) => {
    const newLabor = [...additionalLabor];
    newLabor[index] = { ...newLabor[index], [field]: value };
    setAdditionalLabor(newLabor);
  };

  // Update additional labor (alias for updateLaborMember)
  const updateAdditionalLabor = (index: number, field: string, value: string) => {
    const newLabor = [...additionalLabor];
    newLabor[index] = { ...newLabor[index], [field]: value };
    setAdditionalLabor(newLabor);
  };

  // Remove additional labor member
  const removeAdditionalLabor = (index: number) => {
    setAdditionalLabor(additionalLabor.filter((_: any, i: number) => i !== index));
  };

  // Add additional labor member
  const addAdditionalLabor = () => {
    setAdditionalLabor([...additionalLabor, { name: '', hours: '', rate: '' }]);
  };

  // Update supply item
  const updateSupply = (index: number, field: string, value: string) => {
    const newSupplies = [...supplies];
    newSupplies[index] = { ...newSupplies[index], [field]: value };
    
    if (field === 'unitCost' || field === 'quantity') {
      const unitCost = parseFloat(newSupplies[index].unitCost) || 0;
      const quantity = parseFloat(newSupplies[index].quantity) || 0;
      newSupplies[index].total = unitCost * quantity;
    }
    
    setSupplies(newSupplies);
  };

  // Remove work stage
  const removeWorkStage = (index: number) => {
    setWorkStages(workStages.filter((_: any, i: number) => i !== index));
  };

  // Calculate totals
  const calculateStageTotal = (stage: typeof workStages[0]) => {
    const hours = typeof stage.hours === 'string' ? parseFloat(stage.hours) || 0 : stage.hours;
    return hours * stage.rate;
  };

  const calculatePrimerCosts = () => {
    const pricePerGallon = parseFloat(primerCosts.pricePerGallon) || 0;
    const gallons = parseFloat(primerCosts.gallons) || 0;
    return pricePerGallon * gallons;
  };

  const calculatePaintCosts = () => {
    const pricePerGallon = parseFloat(paintCosts.pricePerGallon) || 0;
    const gallons = parseFloat(paintCosts.gallons) || 0;
    return pricePerGallon * gallons;
  };

  const calculateSuppliesTotal = (): number => {
    return supplies.reduce((sum: number, supply: any) => sum + supply.total, 0);
  };

  const calculateTravelTotal = () => {
    const ratePerKm = parseFloat(travelCosts.ratePerKm) || 0;
    const distance = parseFloat(travelCosts.distance) || 0;
    const trips = parseFloat(travelCosts.trips) || 0;
    return ratePerKm * distance * trips;
  };

  const calculateAdditionalServicesTotal = (): number => {
    return additionalServices
      .filter((service: any) => service.enabled && service.hours > 0)
      .reduce((total: number, service: any) => total + (service.hours * service.rate), 0);
  };

  const calculateAdditionalLaborTotal = (): number => {
    return additionalLabor.reduce((sum: number, member: any) => {
      const hours = parseFloat(member.hours) || 0;
      const rate = parseFloat(member.rate) || 0;
      return sum + (hours * rate);
    }, 0);
  };

  const calculateLaborSubtotal = (): number => workStages.reduce((sum: number, stage: any) => sum + calculateStageTotal(stage), 0) + calculateAdditionalServicesTotal() + calculateAdditionalLaborTotal();
  const calculateMaterialsSubtotal = () => calculatePrimerCosts() + calculatePaintCosts() + calculateSuppliesTotal();
  const calculateSubtotal = () => calculateLaborSubtotal() + calculateMaterialsSubtotal() + calculateTravelTotal();
  
  const calculateTaxes = () => {
    const subtotal = calculateSubtotal();
    let totalTax = 0;
    
    if (taxConfig.country === 'CA') {
      totalTax += subtotal * ((taxConfig.gst || 0) / 100);
      totalTax += subtotal * ((taxConfig.pst || taxConfig.hst || 0) / 100);
    } else if (taxConfig.country === 'US') {
      totalTax += subtotal * ((taxConfig.salesTax || 0) / 100);
    } else if (taxConfig.country === 'OTHER') {
      totalTax += subtotal * ((taxConfig.vat || 0) / 100);
    }
    
    totalTax += subtotal * ((taxConfig.otherTax || 0) / 100);
    return totalTax;
  };
  
  const calculateTotal = () => calculateSubtotal() + calculateTaxes();

  // Email sending functionality
  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      const response = await fetch('/api/send-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email sent successfully!",
        description: "The estimate has been sent to your client.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Email failed",
        description: error.message || "Failed to send estimate email. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Helper function to generate category HTML blocks
  const generateCategoriesHTML = () => {
    let html = '';
    
    // Services & Labor Section (RED)
    const validWorkStages = workStages.filter((stage: any) => parseFloat(String(stage.hours)) > 0);
    const validAdditionalLabor = additionalLabor.filter((member: any) => member.name && parseFloat(String(member.hours)) > 0);
    
    if (validWorkStages.length > 0 || validAdditionalLabor.length > 0) {
      html += `
      <div class="w-full">
        <p class="text-red-500 font-semibold mb-1">SERVICES & LABOUR</p>
        <div class="border border-red-500 bg-zinc-900 px-4 py-2">`;
      
      validWorkStages.forEach((stage: any, index: number) => {
        const hours = parseFloat(String(stage.hours)) || 0;
        const total = (hours * stage.rate).toFixed(2);
        const isLast = index === validWorkStages.length - 1 && validAdditionalLabor.length === 0;
        
        html += `
          <div class="flex justify-between ${isLast ? '' : 'border-b border-gray-700'} py-1">
            <span>${stage.description || stage.name}</span>
            <span>$${total}</span>
          </div>`;
      });
      
      validAdditionalLabor.forEach((member: any, index: number) => {
        const hours = parseFloat(String(member.hours)) || 0;
        const rate = parseFloat(String(member.rate)) || 0;
        const total = (hours * rate).toFixed(2);
        const isLast = index === validAdditionalLabor.length - 1;
        
        html += `
          <div class="flex justify-between ${isLast ? '' : 'border-b border-gray-700'} py-1">
            <span>${member.name}</span>
            <span>$${total}</span>
          </div>`;
      });
      
      html += `
        </div>
      </div>`;
    }
    
    // Materials & Paint Section (ORANGE)  
    const materialsTotal = calculatePrimerCosts() + calculatePaintCosts() + calculateSuppliesTotal();
    const travelTotal = calculateTravelTotal();
    
    if (materialsTotal > 0 || travelTotal > 0) {
      html += `
      <div class="w-full">
        <p class="text-orange-500 font-semibold mb-1">MATERIALS & PAINT</p>
        <div class="border border-orange-500 bg-zinc-900 px-4 py-2">`;
      
      if (materialsTotal > 0) {
        html += `
          <div class="flex justify-between ${travelTotal > 0 ? 'border-b border-gray-700' : ''} py-1">
            <span>Paint & Supplies</span>
            <span>$${materialsTotal.toFixed(2)}</span>
          </div>`;
      }
      
      if (travelTotal > 0) {
        html += `
          <div class="flex justify-between py-1">
            <span>Delivery</span>
            <span>$${travelTotal.toFixed(2)}</span>
          </div>`;
      }
      
      html += `
        </div>
      </div>`;
    }
    
    return html;
  };

  // Generate HTML-based PDF using your custom template
  const generatePDF = async () => {
    try {
      setIsGenerating(true);
      
      // Create HTML content using your template
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Estimate PDF</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @media print {
        body {
          -webkit-print-color-adjust: exact;
        }
      }
    </style>
  </head>
  <body class="bg-black text-white font-sans p-12">
    <!-- Logo and Title -->
    <div class="flex flex-col items-center mb-8">
      <div class="h-16 mb-2 flex items-center justify-center">
        <span class="text-2xl font-bold text-white">A-FRAME PAINTING</span>
      </div>
      <h1 class="text-orange-500 text-3xl font-bold">ESTIMATE</h1>
    </div>

    <!-- Recipient & Sender Info -->
    <div class="flex justify-between text-sm mb-10">
      <div>
        <p class="text-gray-300 font-semibold">Estimate For:</p>
        <p>${clientName || 'Client Name'}</p>
        <p>${clientAddress || '123 Client Street'}</p>
        <p>${clientCity || 'Client City'}, ${clientPostal || 'BC'}</p>
        ${clientPhone ? `<p>${clientPhone}</p>` : ''}
        ${clientEmail ? `<p>${clientEmail}</p>` : ''}
      </div>
      <div class="text-right">
        <p class="text-gray-300 font-semibold">From:</p>
        <p>A-Frame Painting</p>
        <p>884 Hayes Rd</p>
        <p>Manson's Landing, BC</p>
        <p>cortespainter@gmail.com</p>
      </div>
    </div>

    <!-- Dynamic Categories Container -->
    <div id="categories" class="space-y-8">
      ${generateCategoriesHTML()}
    </div>

    <!-- Estimate Total -->
    <div class="flex justify-end mt-10">
      <div class="w-full max-w-sm">
        <div class="flex justify-between border-t border-gray-700 pt-4">
          <span class="text-lg">Subtotal</span>
          <span class="text-lg">$${calculateSubtotal().toFixed(2)}</span>
        </div>
        <div class="flex justify-between bg-green-700 text-white px-4 py-2 mt-2">
          <span class="text-xl font-bold">Estimate Total</span>
          <span class="text-xl font-bold">$${calculateTotal().toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- Validity Note -->
    <div class="text-center text-sm text-gray-400 mt-8">
      <p>This estimate is valid for the next 30 days after we will discuss options with you before proceeding.</p>
    </div>
  </body>
</html>`;

      // Create a temporary element to render the HTML
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window. Please allow popups.');
      }
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
      
      toast({
        title: "Success",
        description: "Estimate PDF opened for download",
      });
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate proper PDF and send email (no screenshots)
  const sendEstimateEmail = async () => {
    if (!clientEmail || !clientEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please add client email to send estimate",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate proper HTML PDF and send email
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Estimate PDF</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @media print {
        body {
          -webkit-print-color-adjust: exact;
        }
      }
    </style>
  </head>
  <body class="bg-black text-white font-sans p-12">
    <!-- Logo and Title -->
    <div class="flex flex-col items-center mb-8">
      <div class="h-16 mb-2 flex items-center justify-center">
        <span class="text-2xl font-bold text-white">A-FRAME PAINTING</span>
      </div>
      <h1 class="text-orange-500 text-3xl font-bold">ESTIMATE</h1>
    </div>

    <!-- Recipient & Sender Info -->
    <div class="flex justify-between text-sm mb-10">
      <div>
        <p class="text-gray-300 font-semibold">Estimate For:</p>
        <p>${clientName || 'Client Name'}</p>
        <p>${clientAddress || '123 Client Street'}</p>
        <p>${clientCity || 'Client City'}, ${clientPostal || 'BC'}</p>
        ${clientPhone ? `<p>${clientPhone}</p>` : ''}
        ${clientEmail ? `<p>${clientEmail}</p>` : ''}
      </div>
      <div class="text-right">
        <p class="text-gray-300 font-semibold">From:</p>
        <p>A-Frame Painting</p>
        <p>884 Hayes Rd</p>
        <p>Manson's Landing, BC</p>
        <p>cortespainter@gmail.com</p>
      </div>
    </div>

    <!-- Dynamic Categories Container -->
    <div id="categories" class="space-y-8">
      ${generateCategoriesHTML()}
    </div>

    <!-- Estimate Total -->
    <div class="flex justify-end mt-10">
      <div class="w-full max-w-sm">
        <div class="flex justify-between border-t border-gray-700 pt-4">
          <span class="text-lg">Subtotal</span>
          <span class="text-lg">$${calculateSubtotal().toFixed(2)}</span>
        </div>
        <div class="flex justify-between bg-green-700 text-white px-4 py-2 mt-2">
          <span class="text-xl font-bold">Estimate Total</span>
          <span class="text-xl font-bold">$${calculateTotal().toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- Validity Note -->
    <div class="text-center text-sm text-gray-400 mt-8">
      <p>This estimate is valid for the next 30 days after we will discuss options with you before proceeding.</p>
    </div>
  </body>
</html>`;

      const emailData = {
        to: clientEmail,
        subject: 'Your Painting Estimate from A-Frame Painting',
        htmlContent: htmlContent,
        plainText: `Here is your estimate from A-Frame Painting for a total of $${calculateTotal().toFixed(2)}.`,
        clientName: clientName,
        estimateTotal: calculateTotal().toFixed(2)
      };

      await sendEmailMutation.mutateAsync(emailData);
    } catch (error: any) {
      console.error('Email sending error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send estimate email",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-black border-gray-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white text-xl font-bold">Estimate Generator</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 pr-2">
          {/* Estimate Details */}
          <div className="border border-gray-700 bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3">Estimate Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Project Title</Label>
                <Input
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder=""
                />
              </div>
              <div>
                <Label className="text-gray-300">Date</Label>
                <Input
                  type="date"
                  value={estimateDate}
                  onChange={(e) => setEstimateDate(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
          </div>

          {/* Client Information - Auto-populated */}
          <div className="border border-blue-500 bg-blue-900/20 rounded-lg p-4">
            <h3 className="text-blue-300 font-semibold mb-3 flex items-center gap-2">
              Client Information
              <span className="text-xs bg-blue-700 px-2 py-1 rounded">Auto-populated</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Client Name</Label>
                <Input
                  value={clientName}
                  readOnly
                  className="bg-gray-700/50 border-gray-500 text-gray-300 cursor-not-allowed"
                  title="Auto-populated from project data"
                />
              </div>
              <div>
                <Label className="text-gray-300">Address</Label>
                <Input
                  value={clientAddress}
                  readOnly
                  className="bg-gray-700/50 border-gray-500 text-gray-300 cursor-not-allowed"
                  title="Auto-populated from project data"
                />
              </div>
              <div>
                <Label className="text-gray-300">City</Label>
                <Input
                  value={clientCity}
                  readOnly
                  className="bg-gray-700/50 border-gray-500 text-gray-300 cursor-not-allowed"
                  title="Auto-populated from project data"
                />
              </div>
              <div>
                <Label className="text-gray-300">Postal Code</Label>
                <Input
                  value={clientPostal}
                  readOnly
                  className="bg-gray-700/50 border-gray-500 text-gray-300 cursor-not-allowed"
                  title="Auto-populated from project data"
                />
              </div>
              <div>
                <Label className="text-gray-300">Email</Label>
                <Input
                  value={clientEmail}
                  readOnly
                  className="bg-gray-700/50 border-gray-500 text-gray-300 cursor-not-allowed"
                  title="Auto-populated from project data"
                />
              </div>
              <div>
                <Label className="text-gray-300">Phone</Label>
                <Input
                  value={clientPhone}
                  readOnly
                  className="bg-gray-700/50 border-gray-500 text-gray-300 cursor-not-allowed"
                  title="Auto-populated from project data"
                />
              </div>
            </div>
          </div>

          {/* Services & Labour */}
          <div className="border border-red-500 bg-red-900/20 rounded-lg p-4">
            <h3 className="text-red-300 font-semibold mb-3">Services & Labour</h3>
            
            {/* Work Stages */}
            <div className="space-y-3 mb-4">
              <Label className="text-gray-300">Work Stages</Label>
              {workStages.map((stage: any, index: number) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    value={stage.description}
                    onChange={(e) => updateWorkStage(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="bg-gray-800 border-gray-600 text-white text-sm"
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={stage.hours}
                    onChange={(e) => updateWorkStage(index, 'hours', e.target.value)}
                    placeholder="Hours"
                    className="bg-gray-800 border-gray-600 text-white text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={stage.rate}
                      onChange={(e) => updateWorkStage(index, 'rate', e.target.value)}
                      placeholder="Rate"
                      className="bg-gray-800 border-gray-600 text-white text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWorkStage(index)}
                      className="text-red-400 hover:text-red-300 px-2"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addWorkStage}
                className="border-red-600 text-red-300 hover:bg-red-900/30"
              >
                + Add Work Stage
              </Button>
            </div>
          </div>

          {/* Additional Labor */}
          <div className="border border-teal-500 bg-teal-900/20 rounded-lg p-4">
            <h3 className="text-teal-300 font-semibold mb-3">Additional Labor</h3>
            <div className="space-y-3">
              {additionalLabor.map((member: any, index: number) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <Input
                    value={member.name}
                    onChange={(e) => updateAdditionalLabor(index, 'name', e.target.value)}
                    placeholder="Name"
                    className="bg-gray-800 border-gray-600 text-white text-sm"
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateAdditionalLabor(index, 'hours', Math.max(0, parseFloat(member.hours || '0') - 0.5).toString())}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 px-2"
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={member.hours}
                      onChange={(e) => updateAdditionalLabor(index, 'hours', e.target.value)}
                      placeholder="Hours"
                      className="bg-gray-800 border-gray-600 text-white text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateAdditionalLabor(index, 'hours', (parseFloat(member.hours || '0') + 0.5).toString())}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 px-2"
                    >
                      +
                    </Button>
                  </div>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={member.rate}
                    onChange={(e) => updateAdditionalLabor(index, 'rate', e.target.value)}
                    placeholder="Rate"
                    className="bg-gray-800 border-gray-600 text-white text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAdditionalLabor(index)}
                    className="text-red-400 hover:text-red-300 px-2"
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addAdditionalLabor}
                className="border-teal-600 text-teal-300 hover:bg-teal-900/30"
              >
                + Add Crew Member
              </Button>
            </div>
          </div>

          {/* Supply Costs */}
          <div className="border border-yellow-500 bg-yellow-900/20 rounded-lg p-4">
            <h3 className="text-yellow-300 font-semibold mb-3">Supply Costs</h3>
            
            {/* Paint Costs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <Label className="text-gray-300">Primer Gallons</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={primerGallons}
                  onChange={(e) => setPrimerGallons(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder=""
                />
              </div>
              <div>
                <Label className="text-gray-300">Paint Gallons</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={paintGallons}
                  onChange={(e) => setPaintGallons(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder=""
                />
              </div>
              <div>
                <Label className="text-gray-300">Cost per Gallon</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={paintCostPerGallon}
                  onChange={(e) => setPaintCostPerGallon(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder=""
                />
              </div>
            </div>

            {/* Additional Supplies */}
            <div className="space-y-3">
              <Label className="text-gray-300">Additional Supplies</Label>
              {supplies.map((supply: any, index: number) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <Input
                    value={supply.item}
                    onChange={(e) => updateSupply(index, 'item', e.target.value)}
                    placeholder="Item"
                    className="bg-gray-800 border-gray-600 text-white text-sm"
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={supply.quantity}
                    onChange={(e) => updateSupply(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="bg-gray-800 border-gray-600 text-white text-sm"
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={supply.unitCost}
                    onChange={(e) => updateSupply(index, 'unitCost', e.target.value)}
                    placeholder="Unit Cost"
                    className="bg-gray-800 border-gray-600 text-white text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSupply(index)}
                    className="text-red-400 hover:text-red-300 px-2"
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addSupply}
                className="border-yellow-600 text-yellow-300 hover:bg-yellow-900/30"
              >
                + Add Supply
              </Button>
            </div>
          </div>

          {/* Travel Costs */}
          <div className="border border-red-400 bg-red-900/20 rounded-lg p-4">
            <h3 className="text-red-300 font-semibold mb-3">Travel Costs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-300">Distance (km)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={travelDistance}
                  onChange={(e) => setTravelDistance(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder=""
                />
              </div>
              <div>
                <Label className="text-gray-300">Cost per km</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={travelRate}
                  onChange={(e) => setTravelRate(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder=""
                />
              </div>
              <div>
                <Label className="text-gray-300">Number of Trips</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={travelTrips}
                  onChange={(e) => setTravelTrips(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder=""
                />
              </div>
            </div>
          </div>

          {/* Tax Configuration */}
          <div className="border border-red-500 bg-red-900/20 rounded-lg p-4">
            <h3 className="text-red-300 font-semibold mb-3">Tax Configuration</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Country/Region</Label>
                <select
                  value={taxConfig.country}
                  onChange={(e) => setTaxConfig((prev: any) => ({ ...prev, country: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded px-3 py-2"
                >
                  <option value="CA">Canada</option>
                  <option value="US">United States</option>
                  <option value="OTHER">Other/International</option>
                </select>
              </div>
              
              {taxConfig.country === 'CA' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">GST (%)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={taxConfig.gst || ''}
                      onChange={(e) => setTaxConfig((prev: any) => ({ ...prev, gst: parseFloat(e.target.value) || 0 }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">PST/HST (%)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={taxConfig.pst || taxConfig.hst || ''}
                      onChange={(e) => setTaxConfig((prev: any) => ({ 
                        ...prev, 
                        pst: parseFloat(e.target.value) || 0,
                        hst: parseFloat(e.target.value) || 0 
                      }))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
              
              {taxConfig.country === 'US' && (
                <div>
                  <Label className="text-gray-300">Sales Tax (%)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={taxConfig.salesTax || ''}
                    onChange={(e) => setTaxConfig((prev: any) => ({ ...prev, salesTax: parseFloat(e.target.value) || 0 }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="0"
                  />
                </div>
              )}
              
              {taxConfig.country === 'OTHER' && (
                <div>
                  <Label className="text-gray-300">VAT (%)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={taxConfig.vat || ''}
                    onChange={(e) => setTaxConfig((prev: any) => ({ ...prev, vat: parseFloat(e.target.value) || 0 }))}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="0"
                  />
                </div>
              )}
              
              <div>
                <Label className="text-gray-300">Other Tax (%)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={taxConfig.otherTax || ''}
                  onChange={(e) => setTaxConfig((prev: any) => ({ ...prev, otherTax: parseFloat(e.target.value) || 0 }))}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="border border-green-600 bg-green-900/20 rounded-lg p-4">
            <h3 className="text-green-300 font-semibold mb-3">Estimate Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>Labor Subtotal:</span>
                <span>$\{calculateLaborSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Materials:</span>
                <span>$\{(calculatePrimerCosts() + calculatePaintCosts() + calculateSuppliesTotal()).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Travel:</span>
                <span>$\{calculateTravelTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300 border-t border-gray-700 pt-2">
                <span>Subtotal:</span>
                <span>$\{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Taxes:</span>
                <span>$\{calculateTaxes().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-300 font-bold text-lg border-t border-green-600 pt-2">
                <span>Total Estimate:</span>
                <span>$\{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {actionMode === 'pdf' ? (
              <Button
                onClick={generatePDF}
                disabled={isGenerating}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={sendEstimateEmail}
                disabled={sendEmailMutation.isPending || !clientEmail}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {sendEmailMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            )}
            
            <div className="flex bg-gray-800 rounded-lg p-1">
              <Button
                variant={actionMode === 'pdf' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActionMode('pdf')}
                className={actionMode === 'pdf' ? 'bg-purple-600 text-white' : 'text-gray-400'}
              >
                <Download className="mr-1 h-3 w-3" />
                PDF
              </Button>
              <Button
                variant={actionMode === 'email' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActionMode('email')}
                className={actionMode === 'email' ? 'bg-blue-600 text-white' : 'text-gray-400'}
              >
                <Mail className="mr-1 h-3 w-3" />
                Email
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Default export for the component
export default EstimateGenerator;
