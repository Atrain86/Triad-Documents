import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Download, Mail, Plus, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface EstimateGeneratorProps {
  project: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function EstimateGenerator({ project, isOpen, onClose }: EstimateGeneratorProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // Helper function to get stored data for this project
  const getStoredEstimateData = () => {
    const storageKey = `estimate_${project?.id || 'default'}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  };

  // Helper function to save estimate data
  const saveEstimateData = (data: any) => {
    const storageKey = `estimate_${project?.id || 'default'}`;
    localStorage.setItem(storageKey, JSON.stringify(data));
  };

  const storedData = getStoredEstimateData();

  const [estimateNumber, setEstimateNumber] = useState(storedData?.estimateNumber || '');
  const [projectTitle, setProjectTitle] = useState(storedData?.projectTitle || '');
  const [projectDescription, setProjectDescription] = useState(storedData?.projectDescription || project?.notes || '');

  // Auto-populated client info from project
  const clientName = project?.clientName || '';
  const clientEmail = project?.clientEmail || '';
  const clientAddress = project?.address || '';
  const clientCity = project?.clientCity || '';
  const clientPostal = project?.clientPostal || '';
  const clientPhone = project?.clientPhone || '';

  // Example work stages state
  const [workStages, setWorkStages] = useState(storedData?.workStages || [
    { name: 'Prep', description: '', hours: '', rate: 60 },
    { name: 'Priming', description: '', hours: '', rate: 60 },
    { name: 'Painting', description: '', hours: '', rate: 60 },
  ]);

  // Paint costs state
  const [primerCosts, setPrimerCosts] = useState(storedData?.primerCosts || {
    pricePerGallon: '',
    gallons: '',
    coats: '1'
  });

  const [paintCosts, setPaintCosts] = useState(storedData?.paintCosts || {
    pricePerGallon: '',
    gallons: '',
    coats: '2'
  });

  const [supplies, setSupplies] = useState(storedData?.supplies || [
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
  const [actionMode, setActionMode] = useState<'download' | 'email'>('email');

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

  // Generate proper PDF with jsPDF (not screenshot)
  const generatePDF = async () => {
    try {
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      let yPos = 20;
      
      // Set dark background
      pdf.setFillColor(26, 26, 26); // #1a1a1a
      pdf.rect(0, 0, 210, 297, 'F'); // Fill entire A4 page
      
      // Set white text color
      pdf.setTextColor(255, 255, 255);
      
      // Header - ESTIMATE (make wider by using more of the page)
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ESTIMATE', 190, yPos, { align: 'right' });
      
      // Add A-Frame Painting logo text (start closer to left edge)
      pdf.setFontSize(16);
      pdf.text('A-FRAME PAINTING', 10, yPos);
      
      yPos += 10;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`#${estimateNumber || 'EST-001'}`, 190, yPos, { align: 'right' });
      pdf.text('884 Hayes Rd, Manson\'s Landing, BC V0P1K0', 10, yPos);
      
      yPos += 10;
      pdf.text(new Date().toLocaleDateString(), 190, yPos, { align: 'right' });
      pdf.text('Email: cortespainter@gmail.com', 10, yPos);
      
      yPos += 20;
      
      // Client Information Section (make wider and taller to fit all content with proper spacing)
      pdf.setFillColor(42, 42, 42); // #2a2a2a
      pdf.rect(10, yPos, 190, 45, 'F');  // Made taller to fit all information with spacing
      
      yPos += 10;  // More top spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('Estimate For:', 15, yPos);
      
      yPos += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.text(clientName, 15, yPos);
      
      yPos += 6;
      pdf.text(clientAddress, 15, yPos);
      
      yPos += 6;
      pdf.text(`${clientCity}, ${clientPostal}`, 15, yPos);
      
      yPos += 6;
      pdf.text(clientPhone, 15, yPos);  // Move phone to left side with other info
      
      yPos += 6;
      pdf.text(clientEmail, 15, yPos);  // Keep email on left side
      
      yPos += 15;  // More bottom spacing before next section
      
      // Services & Labor Section with gray container
      const laborStartY = yPos;
      
      // Calculate container height based on content
      const validWorkStages = workStages.filter(stage => parseFloat(String(stage.hours)) > 0);
      const validAdditionalLabor = additionalLabor.filter(member => member.name && parseFloat(String(member.hours)) > 0);
      const laborItemCount = validWorkStages.length + validAdditionalLabor.length;
      const laborContainerHeight = 8 + (laborItemCount * 15) + 10; // Header + items + bottom padding
      
      // Draw gray container for Services & Labor
      pdf.setFillColor(42, 42, 42); // #2a2a2a
      pdf.rect(10, yPos, 190, laborContainerHeight, 'F');
      
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Services & Labor', 15, yPos);
      yPos += 8;
      
      // Work stages (increased spacing for better readability)
      validWorkStages.forEach((stage: any) => {
        const hours = parseFloat(String(stage.hours)) || 0;
        const total = (hours * stage.rate).toFixed(2);
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(stage.description || stage.name, 15, yPos);
        pdf.text(`${hours}h × $${stage.rate}`, 15, yPos + 5);  // Increased spacing from 4 to 5
        pdf.text(`$${total}`, 190, yPos, { align: 'right' });
        yPos += 15;  // Increased spacing from 12 to 15
      });
      
      // Additional Labor (increased spacing for better readability)
      validAdditionalLabor.forEach((member: any) => {
        const hours = parseFloat(String(member.hours)) || 0;
        const rate = parseFloat(String(member.rate)) || 0;
        const total = (hours * rate).toFixed(2);
        
        pdf.text(member.name, 15, yPos);
        pdf.text(`${hours}h × $${rate}`, 15, yPos + 5);  // Increased spacing from 4 to 5
        pdf.text(`$${total}`, 190, yPos, { align: 'right' });
        yPos += 15;  // Increased spacing from 12 to 15
      });
      
      yPos = laborStartY + laborContainerHeight + 10;
      
      // Materials & Paint Section with gray container
      const materialsStartY = yPos;
      const materialsTotal = (calculatePrimerCosts() + calculatePaintCosts() + calculateSuppliesTotal()).toFixed(2);
      const travelTotal = calculateTravelTotal().toFixed(2);
      
      // Calculate materials container height
      let materialsItemCount = 0;
      if (parseFloat(materialsTotal) > 0) materialsItemCount++;
      if (parseFloat(travelTotal) > 0) materialsItemCount++;
      const materialsContainerHeight = 8 + (materialsItemCount * 8) + 10; // Header + items + bottom padding
      
      // Draw gray container for Materials & Paint
      pdf.setFillColor(42, 42, 42); // #2a2a2a
      pdf.rect(10, yPos, 190, materialsContainerHeight, 'F');
      
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Materials & Paint', 15, yPos);
      yPos += 8;
      
      if (parseFloat(materialsTotal) > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.text('Paint & Supplies', 15, yPos);
        pdf.text(`$${materialsTotal}`, 190, yPos, { align: 'right' });
        yPos += 8;
      }
      
      if (parseFloat(travelTotal) > 0) {
        pdf.text('Delivery', 15, yPos);
        pdf.text(`$${travelTotal}`, 190, yPos, { align: 'right' });
        yPos += 8;
      }
      
      yPos = materialsStartY + materialsContainerHeight + 10;
      
      yPos += 15;
      
      // Summary Section (make wider)
      pdf.setFillColor(42, 42, 42); // #2a2a2a
      pdf.rect(10, yPos, 190, 35, 'F');
      
      yPos += 10;
      pdf.text('Subtotal:', 15, yPos);
      pdf.text(`$${calculateSubtotal().toFixed(2)}`, 190, yPos, { align: 'right' });
      
      yPos += 8;
      pdf.text('Paint & Materials:', 15, yPos);
      pdf.text(`$${materialsTotal}`, 190, yPos, { align: 'right' });
      
      yPos += 12;
      // Total with green background effect (extend green box to cover both text and price)
      pdf.setFont('helvetica', 'bold');
      pdf.setFillColor(5, 150, 105); // #059669
      pdf.rect(10, yPos - 5, 190, 10, 'F');  // Wide green box covering full width
      pdf.setTextColor(255, 255, 255);
      pdf.text('Total Estimate:', 15, yPos);
      pdf.text(`$${calculateTotal().toFixed(2)}`, 190, yPos, { align: 'right' });
      
      // Footer (increased spacing to prevent cutoff)
      yPos += 25;
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Thank you for considering A-Frame Painting!', 105, yPos, { align: 'center' });
      
      yPos += 10;
      pdf.setFont('helvetica', 'normal');
      pdf.text('This estimate is valid for 30 days from the date above.', 105, yPos, { align: 'center' });
      
      pdf.save(`Estimate-${estimateNumber || 'unknown'}.pdf`);

      toast({
        title: 'PDF Generated',
        description: 'Professional estimate PDF has been downloaded.',
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF.',
        variant: 'destructive',
      });
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
      // Generate proper PDF using jsPDF (same as download function)
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      let yPos = 20;
      
      // Set dark background
      pdf.setFillColor(26, 26, 26); // #1a1a1a
      pdf.rect(0, 0, 210, 297, 'F'); // Fill entire A4 page
      
      // Set white text color
      pdf.setTextColor(255, 255, 255);
      
      // Header - ESTIMATE (make wider by using more of the page)
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ESTIMATE', 190, yPos, { align: 'right' });
      
      // Add A-Frame Painting logo text (start closer to left edge)
      pdf.setFontSize(16);
      pdf.text('A-FRAME PAINTING', 10, yPos);
      
      yPos += 10;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`#${estimateNumber || 'EST-001'}`, 190, yPos, { align: 'right' });
      pdf.text('884 Hayes Rd, Manson\'s Landing, BC V0P1K0', 10, yPos);
      
      yPos += 10;
      pdf.text(new Date().toLocaleDateString(), 190, yPos, { align: 'right' });
      pdf.text('Email: cortespainter@gmail.com', 10, yPos);
      
      yPos += 20;
      
      // Client Information Section (make wider and taller to fit all content with proper spacing)
      pdf.setFillColor(42, 42, 42); // #2a2a2a
      pdf.rect(10, yPos, 190, 45, 'F');  // Made taller to fit all information with spacing
      
      yPos += 10;  // More top spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('Estimate For:', 15, yPos);
      
      yPos += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.text(clientName, 15, yPos);
      
      yPos += 6;
      pdf.text(clientAddress, 15, yPos);
      
      yPos += 6;
      pdf.text(`${clientCity}, ${clientPostal}`, 15, yPos);
      
      yPos += 6;
      pdf.text(clientPhone, 15, yPos);  // Move phone to left side with other info
      
      yPos += 6;
      pdf.text(clientEmail, 15, yPos);  // Keep email on left side
      
      yPos += 15;  // More bottom spacing before next section
      
      // Services & Labor Section with gray container
      const laborStartY2 = yPos;
      
      // Calculate container height based on content
      const validWorkStages2 = workStages.filter((stage: any) => parseFloat(String(stage.hours)) > 0);
      const validAdditionalLabor2 = additionalLabor.filter((member: any) => member.name && parseFloat(String(member.hours)) > 0);
      const laborItemCount2 = validWorkStages2.length + validAdditionalLabor2.length;
      const laborContainerHeight2 = 8 + (laborItemCount2 * 15) + 10; // Header + items + bottom padding
      
      // Draw Paint Brain green container for Services & Labor
      pdf.setFillColor(106, 153, 85); // Paint Brain Green #6A9955
      pdf.rect(10, yPos, 190, laborContainerHeight2, 'F');
      
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255); // White text on green background
      pdf.text('Services & Labor', 15, yPos);
      pdf.setTextColor(255, 255, 255); // Keep white for content
      yPos += 8;
      
      // Work stages (increased spacing for better readability)
      validWorkStages2.forEach((stage: any) => {
        const hours = parseFloat(String(stage.hours)) || 0;
        const total = (hours * stage.rate).toFixed(2);
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(stage.description || stage.name, 15, yPos);
        pdf.text(`${hours}h × $${stage.rate}`, 15, yPos + 5);  // Increased spacing from 4 to 5
        pdf.text(`$${total}`, 190, yPos, { align: 'right' });
        yPos += 15;  // Increased spacing from 12 to 15
      });
      
      // Additional Labor (increased spacing for better readability)
      validAdditionalLabor2.forEach((member: any) => {
        const hours = parseFloat(String(member.hours)) || 0;
        const rate = parseFloat(String(member.rate)) || 0;
        const total = (hours * rate).toFixed(2);
        
        pdf.text(member.name, 15, yPos);
        pdf.text(`${hours}h × $${rate}`, 15, yPos + 5);  // Increased spacing from 4 to 5
        pdf.text(`$${total}`, 190, yPos, { align: 'right' });
        yPos += 15;  // Increased spacing from 12 to 15
      });
      
      yPos = laborStartY2 + laborContainerHeight2 + 10;
      
      // Materials & Paint Section with gray container
      const materialsStartY2 = yPos;
      const materialsTotal2 = (calculatePrimerCosts() + calculatePaintCosts() + calculateSuppliesTotal()).toFixed(2);
      const travelTotal2 = calculateTravelTotal().toFixed(2);
      
      // Calculate materials container height
      let materialsItemCount2 = 0;
      if (parseFloat(materialsTotal2) > 0) materialsItemCount2++;
      if (parseFloat(travelTotal2) > 0) materialsItemCount2++;
      const materialsContainerHeight2 = 8 + (materialsItemCount2 * 8) + 10; // Header + items + bottom padding
      
      // Draw Paint Brain yellow container for Materials & Paint
      pdf.setFillColor(220, 220, 170); // Paint Brain Yellow #DCDCAA
      pdf.rect(10, yPos, 190, materialsContainerHeight2, 'F');
      
      yPos += 8;
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Black text on yellow background
      pdf.text('Materials & Paint', 15, yPos);
      yPos += 8;
      
      if (parseFloat(materialsTotal2) > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0); // Black text on yellow background
        pdf.text('Paint & Supplies', 15, yPos);
        pdf.text(`$${materialsTotal2}`, 190, yPos, { align: 'right' });
        yPos += 8;
      }
      
      if (parseFloat(travelTotal2) > 0) {
        pdf.setTextColor(0, 0, 0); // Black text on yellow background
        pdf.text('Delivery', 15, yPos);
        pdf.text(`$${travelTotal2}`, 190, yPos, { align: 'right' });
        yPos += 8;
      }
      
      yPos = materialsStartY2 + materialsContainerHeight2 + 10;
      
      yPos += 15;
      
      // Summary Section (Paint Brain purple background)
      pdf.setFillColor(139, 95, 191); // Paint Brain Purple #8B5FBF
      pdf.rect(10, yPos, 190, 35, 'F');
      
      yPos += 10;
      pdf.setTextColor(255, 255, 255); // White text on purple background
      pdf.text('Subtotal:', 15, yPos);
      pdf.text(`$${calculateSubtotal().toFixed(2)}`, 190, yPos, { align: 'right' });
      
      yPos += 8;
      pdf.text('Paint & Materials:', 15, yPos);
      pdf.text(`$${materialsTotal2}`, 190, yPos, { align: 'right' });
      
      yPos += 12;
      // Total with Paint Brain orange background and larger font
      pdf.setFont('helvetica', 'bold');
      pdf.setFillColor(212, 165, 116); // Paint Brain Orange #D4A574
      pdf.rect(10, yPos - 7, 190, 16, 'F');  // Taller box for larger font
      pdf.setTextColor(0, 0, 0); // Black text on orange background
      pdf.setFontSize(16); // Larger font for total
      pdf.text('TOTAL ESTIMATE:', 15, yPos);
      pdf.text(`$${calculateTotal().toFixed(2)}`, 190, yPos, { align: 'right' });
      pdf.setFontSize(12); // Reset font size
      
      // Footer (increased spacing to prevent cutoff)
      yPos += 25;
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Thank you for considering A-Frame Painting!', 105, yPos, { align: 'center' });
      
      yPos += 10;
      pdf.setFont('helvetica', 'normal');
      pdf.text('This estimate is valid for 30 days from the date above.', 105, yPos, { align: 'center' });
      
      // Get PDF as base64 for email
      let pdfOutput;
      let pdfBase64;
      
      try {
        pdfOutput = pdf.output('datauristring');
        console.log('PDF output generated:', pdfOutput ? 'Success' : 'Failed');
        
        if (!pdfOutput || typeof pdfOutput !== 'string') {
          throw new Error('Failed to generate PDF output - output is not a string');
        }
        
        pdfBase64 = pdfOutput.split(',')[1];
        console.log('PDF base64 extracted, length:', pdfBase64 ? pdfBase64.length : 'undefined');
        
        if (!pdfBase64 || pdfBase64.length === 0) {
          throw new Error('Failed to extract base64 data from PDF');
        }
        
        // Validate base64 data size (should be much smaller now)
        if (pdfBase64.length > 5000000) { // ~3.75MB base64 limit
          throw new Error('PDF too large for email. Please reduce content.');
        }
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        throw new Error(`PDF generation failed: ${pdfError.message}`);
      }

      const emailData = {
        recipientEmail: clientEmail,
        clientName: clientName || 'Client',
        estimateNumber: estimateNumber || 'EST-001',
        projectTitle: projectTitle || 'Painting Estimate',
        totalAmount: calculateTotal().toFixed(2),
        customMessage: '',
        pdfData: pdfBase64
      };

      await sendEmailMutation.mutateAsync(emailData);
    } catch (error: any) {
      console.error('Email preparation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send estimate email",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-screen max-w-md h-screen p-4 sm:max-w-3xl sm:h-auto overflow-hidden"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold mb-4">Generate Estimate</DialogTitle>
        </DialogHeader>

        <div
          ref={printRef}
          className="overflow-y-auto max-h-[calc(100vh-160px)] pr-2"
        >
          {/* Client Info (read-only) */}
          <Card className="mb-4 border-2 border-[#FF6B6B]">
            <CardHeader>
              <CardTitle className="text-lg text-[#FF6B6B]">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input value={clientName} readOnly placeholder="Client Name" />
              <Input value={clientEmail} readOnly placeholder="Client Email" />
              <Input value={clientAddress} readOnly placeholder="Client Address" />
              <Input value={clientCity} readOnly placeholder="City" />
              <Input value={clientPostal} readOnly placeholder="Postal Code" />
              <Input value={clientPhone} readOnly placeholder="Phone" />
            </CardContent>
          </Card>

          {/* Estimate Details */}
          <Card className="mb-4 border-2 border-[#D4A574]">
            <CardHeader>
              <CardTitle className="text-lg text-[#D4A574]">Estimate Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="Estimate Number"
                value={estimateNumber}
                onChange={(e) => setEstimateNumber(e.target.value)}
              />
              <Input
                type="date"
                value={new Date().toISOString().split('T')[0]}
                readOnly
              />
              <Input
                placeholder="Project Title"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
              />
              <Textarea
                placeholder="Project Description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Work Stages */}
          <Card className="mb-4 border-2 border-[#DCDCAA]">
            <CardHeader className="flex justify-between items-center">
              <CardTitle className="text-lg text-[#DCDCAA]">Work Breakdown</CardTitle>
              <Button size="sm" onClick={addWorkStage} className="bg-[#DCDCAA] hover:bg-[#c4c193] text-black">+ Add Stage</Button>
            </CardHeader>
            <CardContent>
              {workStages.map((stage: any, i: number) => (
                <div
                  key={i}
                  className="mb-3 border-2 border-[#DCDCAA] bg-[#DCDCAA]/10 rounded p-3"
                >
                  <Input
                    placeholder="Stage Name"
                    value={stage.name}
                    onChange={(e) => updateWorkStage(i, 'name', e.target.value)}
                    className="mb-1"
                  />
                  <Textarea
                    placeholder="Description"
                    value={stage.description}
                    onChange={(e) => updateWorkStage(i, 'description', e.target.value)}
                    className="mb-1"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Hours"
                      value={stage.hours}
                      onChange={(e) => updateWorkStage(i, 'hours', e.target.value)}
                      className="flex-1"
                      min={0}
                    />
                    <Input
                      type="number"
                      placeholder="Rate"
                      value={stage.rate}
                      onChange={(e) => updateWorkStage(i, 'rate', Number(e.target.value))}
                      className="flex-1"
                      min={0}
                    />
                    <Input
                      placeholder="Total"
                      value={calculateStageTotal(stage).toFixed(2)}
                      readOnly
                      className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeWorkStage(i)}
                    className="mt-2 bg-[#E03E3E] hover:bg-[#c63535]"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Additional Services */}
          <Card className="mb-4 border-2 border-[#D4A574]">
            <CardHeader>
              <CardTitle className="text-lg text-[#D4A574]">Additional Services</CardTitle>
            </CardHeader>
            <CardContent>
              {additionalServices.map((service: any, i: number) => (
                <div key={i} className="border border-[#D4A574] rounded p-3 mb-2 bg-[#D4A574]/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={service.enabled}
                        onCheckedChange={(checked: boolean) => updateAdditionalService(i, 'enabled', checked)}
                      />
                      <span className="font-medium">{service.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">${service.rate}/hour</span>
                  </div>
                  {service.enabled && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAdditionalService(i, 'hours', Math.max(0, service.hours - 0.5))}
                        disabled={service.hours <= 0}
                        className="px-2"
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        value={service.hours}
                        onChange={(e) => updateAdditionalService(i, 'hours', Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-20 text-center"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAdditionalService(i, 'hours', service.hours + 0.5)}
                        className="px-2"
                      >
                        +
                      </Button>
                      <span className="text-sm">hours</span>
                      <span className="ml-auto font-medium">${(service.hours * service.rate).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}
              <div className="text-right font-medium">
                Additional Services Total: ${calculateAdditionalServicesTotal().toFixed(2)}
              </div>
            </CardContent>
          </Card>

          {/* Additional Labor */}
          <Card className="mb-4 border-2 border-[#4ECDC4]">
            <CardHeader>
              <CardTitle className="text-lg text-[#4ECDC4]">Additional Labor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Crew Members</h4>
                <Button size="sm" onClick={addLaborMember} className="bg-[#4ECDC4] hover:bg-[#45b3b8] text-black">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Member
                </Button>
              </div>
              {additionalLabor.map((member: any, i: number) => (
                <div key={i} className="border border-[#4ECDC4] rounded p-3 mb-2 bg-[#4ECDC4]/10">
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <Input
                      placeholder="Name"
                      value={member.name}
                      onChange={(e) => updateLaborMember(i, 'name', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Hours"
                      value={member.hours}
                      onChange={(e) => updateLaborMember(i, 'hours', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Rate/hour"
                      value={member.rate}
                      onChange={(e) => updateLaborMember(i, 'rate', e.target.value)}
                    />
                    <Input
                      placeholder="Total"
                      value={((parseFloat(member.hours) || 0) * (parseFloat(member.rate) || 0)).toFixed(2)}
                      readOnly
                      className="bg-gray-100 dark:bg-gray-700"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeLaborMember(i)}
                    className="bg-[#E03E3E] hover:bg-[#c63535]"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
              <div className="text-right font-medium">
                Additional Labor Total: ${calculateAdditionalLaborTotal().toFixed(2)}
              </div>
            </CardContent>
          </Card>

          {/* Supply Costs */}
          <Card className="mb-4 border-2 border-[#6A9955]">
            <CardHeader>
              <CardTitle className="text-lg text-[#6A9955]">Supply Costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primer Costs */}
              <div className="border border-[#6A9955] rounded p-3 bg-[#6A9955]/10">
                <h4 className="font-medium mb-2">Primer</h4>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Price per gallon"
                    value={primerCosts.pricePerGallon}
                    onChange={(e) => setPrimerCosts({...primerCosts, pricePerGallon: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Gallons"
                    value={primerCosts.gallons}
                    onChange={(e) => setPrimerCosts({...primerCosts, gallons: e.target.value})}
                  />
                  <Select value={primerCosts.coats} onValueChange={(value) => setPrimerCosts({...primerCosts, coats: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Coats" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border border-gray-600">
                      <SelectItem value="0" className="text-white hover:bg-gray-800">0 coats</SelectItem>
                      <SelectItem value="1" className="text-white hover:bg-gray-800">1 coat</SelectItem>
                      <SelectItem value="2" className="text-white hover:bg-gray-800">2 coats</SelectItem>
                      <SelectItem value="3" className="text-white hover:bg-gray-800">3 coats</SelectItem>
                      <SelectItem value="4" className="text-white hover:bg-gray-800">4 coats</SelectItem>
                      <SelectItem value="5" className="text-white hover:bg-gray-800">5 coats</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-2 text-right font-medium">
                  Primer Total: ${calculatePrimerCosts().toFixed(2)}
                </div>
              </div>

              {/* Paint Costs */}
              <div className="border border-[#6A9955] rounded p-3 bg-[#6A9955]/10">
                <h4 className="font-medium mb-2">Paint</h4>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Price per gallon"
                    value={paintCosts.pricePerGallon}
                    onChange={(e) => setPaintCosts({...paintCosts, pricePerGallon: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Gallons"
                    value={paintCosts.gallons}
                    onChange={(e) => setPaintCosts({...paintCosts, gallons: e.target.value})}
                  />
                  <Select value={paintCosts.coats} onValueChange={(value) => setPaintCosts({...paintCosts, coats: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Coats" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border border-gray-600">
                      <SelectItem value="1" className="text-white hover:bg-gray-800">1 coat</SelectItem>
                      <SelectItem value="2" className="text-white hover:bg-gray-800">2 coats</SelectItem>
                      <SelectItem value="3" className="text-white hover:bg-gray-800">3 coats</SelectItem>
                      <SelectItem value="4" className="text-white hover:bg-gray-800">4 coats</SelectItem>
                      <SelectItem value="5" className="text-white hover:bg-gray-800">5 coats</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-2 text-right font-medium">
                  Paint Total: ${calculatePaintCosts().toFixed(2)}
                </div>
              </div>

              {/* Other Supplies */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Other Supplies</h4>
                  <Button size="sm" onClick={addSupply} className="bg-[#DCDCAA] hover:bg-[#c5c593] text-black">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Supply
                  </Button>
                </div>
                {supplies.map((supply: any, i: number) => (
                  <div key={i} className="border border-[#DCDCAA] rounded p-3 mb-2 bg-[#DCDCAA]/10">
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <Input
                        placeholder="Item name"
                        value={supply.name}
                        onChange={(e) => updateSupply(i, 'name', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        value={supply.unitCost}
                        onChange={(e) => updateSupply(i, 'unitCost', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Quantity"
                        value={supply.quantity}
                        onChange={(e) => updateSupply(i, 'quantity', e.target.value)}
                      />
                      <Input
                        placeholder="Total"
                        value={supply.total.toFixed(2)}
                        readOnly
                        className="bg-gray-100 dark:bg-gray-700"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeSupply(i)}
                      className="bg-[#E03E3E] hover:bg-[#c63535]"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ))}
                <div className="text-right font-medium">
                  Supplies Total: ${calculateSuppliesTotal().toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Travel Costs */}
          <Card className="mb-4 border-2 border-[#569CD6]">
            <CardHeader>
              <CardTitle className="text-lg text-[#569CD6]">Travel Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-[#569CD6] rounded p-3 bg-[#569CD6]/10">
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Rate per km"
                    value={travelCosts.ratePerKm}
                    onChange={(e) => setTravelCosts({...travelCosts, ratePerKm: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Distance (km)"
                    value={travelCosts.distance}
                    onChange={(e) => setTravelCosts({...travelCosts, distance: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Number of trips"
                    value={travelCosts.trips}
                    onChange={(e) => setTravelCosts({...travelCosts, trips: e.target.value})}
                  />
                </div>
                <div className="mt-2 text-right font-medium">
                  Travel Total: ${calculateTravelTotal().toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Configuration */}
          <Card className="mb-4 border-2 border-[#569CD6]">
            <CardHeader>
              <CardTitle className="text-lg text-[#569CD6]">Tax Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Country Selector */}
                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  <Select value={taxConfig.country} onValueChange={(value) => setTaxConfig({...taxConfig, country: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border border-gray-600">
                      <SelectItem value="CA" className="text-white hover:bg-gray-800">Canada</SelectItem>
                      <SelectItem value="US" className="text-white hover:bg-gray-800">United States</SelectItem>
                      <SelectItem value="OTHER" className="text-white hover:bg-gray-800">Other / International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Canadian Tax Fields */}
                {taxConfig.country === 'CA' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">GST (%)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="5"
                        value={taxConfig.gst || ''}
                        onChange={(e) => setTaxConfig({...taxConfig, gst: parseFloat(e.target.value) || 0})}
                      />
                      <small className="text-gray-500">Goods and Services Tax</small>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">PST/HST (%)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={taxConfig.pst || taxConfig.hst || ''}
                        onChange={(e) => setTaxConfig({...taxConfig, pst: parseFloat(e.target.value) || 0, hst: parseFloat(e.target.value) || 0})}
                      />
                      <small className="text-gray-500">Provincial/Harmonized Tax</small>
                    </div>
                  </div>
                )}

                {/* US Tax Fields */}
                {taxConfig.country === 'US' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Sales Tax (%)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={taxConfig.salesTax || ''}
                      onChange={(e) => setTaxConfig({...taxConfig, salesTax: parseFloat(e.target.value) || 0})}
                    />
                    <small className="text-gray-500">State and local sales taxes</small>
                  </div>
                )}

                {/* International Tax Fields */}
                {taxConfig.country === 'OTHER' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">VAT (%)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={taxConfig.vat || ''}
                      onChange={(e) => setTaxConfig({...taxConfig, vat: parseFloat(e.target.value) || 0})}
                    />
                    <small className="text-gray-500">Value Added Tax</small>
                  </div>
                )}

                {/* Other Tax Field - Always Show */}
                <div>
                  <label className="block text-sm font-medium mb-1">Other Tax/Fees (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={taxConfig.otherTax || ''}
                    onChange={(e) => setTaxConfig({...taxConfig, otherTax: parseFloat(e.target.value) || 0})}
                  />
                  <small className="text-gray-500">Any additional taxes or fees</small>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="mb-4 border-2 border-[#8B5FBF]">
            <CardHeader>
              <CardTitle className="text-lg text-[#8B5FBF]">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Labor:</span>
                  <span>${calculateLaborSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Materials:</span>
                  <span>${calculateMaterialsSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Travel:</span>
                  <span>${calculateTravelTotal().toFixed(2)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes:</span>
                    <span>${calculateTaxes().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Section - Inside scrollable content */}
          <Card className="mb-4 border-2 border-[#8B5FBF]">
            <CardHeader>
              <CardTitle className="text-lg text-[#8B5FBF]">Generate Estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Toggle Switch */}
                <div className="flex justify-center">
                  <div className="relative inline-flex items-center">
                    <button
                      onClick={() => setActionMode(actionMode === 'email' ? 'download' : 'email')}
                      className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        actionMode === 'email' ? 'bg-[#569CD6]' : 'bg-[#6A9955]'
                      }`}
                    >
                      <span
                        className={`inline-block h-10 w-10 transform rounded-full bg-white transition-transform duration-200 ${
                          actionMode === 'email' ? 'translate-x-1' : 'translate-x-[3.25rem]'
                        }`}
                      />
                      <Mail 
                        className={`absolute left-2 h-5 w-5 transition-opacity duration-200 ${
                          actionMode === 'email' ? 'text-white opacity-100' : 'text-white opacity-60'
                        }`} 
                        style={{ color: '#FFFFFF' }}
                      />
                      <Download 
                        className={`absolute right-2 h-5 w-5 transition-opacity duration-200 ${
                          actionMode === 'download' ? 'text-white opacity-100' : 'text-white opacity-60'
                        }`} 
                        style={{ color: '#FFFFFF' }}
                      />
                    </button>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} className="flex-1 h-12">
                    Cancel
                  </Button>
                  
                  {actionMode === 'email' ? (
                    <Button 
                      onClick={sendEstimateEmail} 
                      className="bg-[#569CD6] hover:bg-[#4a8bc2] flex-1 h-12"
                      disabled={sendEmailMutation.isPending}
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                    </Button>
                  ) : (
                    <Button onClick={generatePDF} className="bg-[#6A9955] hover:bg-[#5a8245] flex-1 h-12">
                      <Download className="w-5 h-5 mr-2" />
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
      

    </Dialog>
  );
}