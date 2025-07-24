import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  // Load saved form data from localStorage
  const loadSavedData = () => {
    try {
      const saved = localStorage.getItem('estimateFormData');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const savedData = loadSavedData();

  const [estimateNumber, setEstimateNumber] = useState(savedData.estimateNumber || '');
  const [projectTitle, setProjectTitle] = useState(savedData.projectTitle || '');
  const [projectDescription, setProjectDescription] = useState(project?.notes || '');

  // Auto-populated client info from project
  const clientName = project?.clientName || '';
  const clientEmail = project?.clientEmail || '';
  const clientAddress = project?.address || '';
  const clientCity = project?.clientCity || '';
  const clientPostal = project?.clientPostal || '';
  const clientPhone = project?.clientPhone || '';

  // Work stages state with localStorage persistence
  const [workStages, setWorkStages] = useState(savedData.workStages || [
    { name: 'Prep', description: '', hours: '', rate: 60 },
    { name: 'Priming', description: '', hours: '', rate: 60 },
    { name: 'Painting', description: '', hours: '', rate: 60 },
  ]);

  // Paint costs state with localStorage persistence
  const [primerCosts, setPrimerCosts] = useState(savedData.primerCosts || {
    pricePerGallon: '',
    gallons: '',
    coats: '1'
  });

  const [paintCosts, setPaintCosts] = useState(savedData.paintCosts || {
    pricePerGallon: '',
    gallons: '',
    coats: '2'
  });

  const [supplies, setSupplies] = useState(savedData.supplies || [
    { name: 'Tape', unitCost: '', quantity: '', total: 0 },
    { name: 'Brushes', unitCost: '', quantity: '', total: 0 },
    { name: 'Rollers', unitCost: '', quantity: '', total: 0 }
  ]);

  // Travel costs state with localStorage persistence
  const [travelCosts, setTravelCosts] = useState(savedData.travelCosts || {
    ratePerKm: '0.50',
    distance: '',
    trips: '2'
  });

  // Additional labor state with localStorage persistence
  const [additionalLabor, setAdditionalLabor] = useState(savedData.additionalLabor || [
    { name: '', hours: '', rate: '' }
  ]);

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

  // Toggle state for action buttons
  const [actionMode, setActionMode] = useState<'download' | 'email'>('email');

  // Save form data to localStorage whenever state changes
  useEffect(() => {
    const formData = {
      estimateNumber,
      projectTitle,
      workStages,
      primerCosts,
      paintCosts,
      supplies,
      travelCosts,
      additionalLabor
    };
    localStorage.setItem('estimateFormData', JSON.stringify(formData));
  }, [estimateNumber, projectTitle, workStages, primerCosts, paintCosts, supplies, travelCosts, additionalLabor]);

  // Clear all saved form data
  const clearFormData = () => {
    localStorage.removeItem('estimateFormData');
    setEstimateNumber('');
    setProjectTitle('');
    setWorkStages([
      { name: 'Prep', description: '', hours: '', rate: 60 },
      { name: 'Priming', description: '', hours: '', rate: 60 },
      { name: 'Painting', description: '', hours: '', rate: 60 },
    ]);
    setPrimerCosts({ pricePerGallon: '', gallons: '', coats: '1' });
    setPaintCosts({ pricePerGallon: '', gallons: '', coats: '2' });
    setSupplies([
      { name: 'Tape', unitCost: '', quantity: '', total: 0 },
      { name: 'Brushes', unitCost: '', quantity: '', total: 0 },
      { name: 'Rollers', unitCost: '', quantity: '', total: 0 }
    ]);
    setTravelCosts({ ratePerKm: '0.50', distance: '', trips: '2' });
    setAdditionalLabor([{ name: '', hours: '', rate: '' }]);
    toast({
      title: "Form Cleared",
      description: "All estimate data has been reset.",
    });
  };

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
    setSupplies(supplies.filter((_, i) => i !== index));
  };

  // Add new labor member
  const addLaborMember = () => {
    setAdditionalLabor([...additionalLabor, { name: '', hours: '', rate: '' }]);
  };

  // Remove labor member
  const removeLaborMember = (index: number) => {
    setAdditionalLabor(additionalLabor.filter((_, i) => i !== index));
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
    setWorkStages(workStages.filter((_, i) => i !== index));
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

  const calculateSuppliesTotal = () => {
    return supplies.reduce((sum, supply) => sum + supply.total, 0);
  };

  const calculateTravelTotal = () => {
    const ratePerKm = parseFloat(travelCosts.ratePerKm) || 0;
    const distance = parseFloat(travelCosts.distance) || 0;
    const trips = parseFloat(travelCosts.trips) || 0;
    return ratePerKm * distance * trips;
  };

  const calculateAdditionalLaborTotal = () => {
    return additionalLabor.reduce((sum, member) => {
      const hours = parseFloat(member.hours) || 0;
      const rate = parseFloat(member.rate) || 0;
      return sum + (hours * rate);
    }, 0);
  };

  const calculateLaborSubtotal = () => workStages.reduce((sum, stage) => sum + calculateStageTotal(stage), 0) + calculateAdditionalLaborTotal();
  const calculateMaterialsSubtotal = () => calculatePrimerCosts() + calculatePaintCosts() + calculateSuppliesTotal();
  const calculateSubtotal = () => calculateLaborSubtotal() + calculateMaterialsSubtotal() + calculateTravelTotal();
  
  const calculateTaxes = () => {
    const subtotal = calculateSubtotal();
    const taxConfig = getGlobalTaxConfig();
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

  // Gmail OAuth email sending functionality
  const sendGmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      // Check if user has Gmail connected
      const statusResponse = await fetch(`/api/gmail/status/${user?.id}`);
      const statusData = await statusResponse.json();
      
      if (!statusData.connected) {
        throw new Error('Gmail account not connected. Please connect your Gmail account in Settings first.');
      }

      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          to: emailData.recipientEmail,
          subject: `Painting Estimate from A-Frame Painting - EST ${emailData.estimateNumber}`,
          message: `Dear ${emailData.clientName},

Please find attached your painting estimate from A-Frame Painting.

Project: ${emailData.projectTitle}
Estimate Total: $${emailData.totalAmount}

This estimate is valid for 30 days. If you have any questions or would like to proceed with the project, please don't hesitate to contact us.

Thank you for considering A-Frame Painting for your project.

Best regards,
A-Frame Painting Team
cortespainter@gmail.com`,
          htmlMessage: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #EA580C;">Painting Estimate from A-Frame Painting</h2>
              <p>Dear ${emailData.clientName},</p>
              <p>Please find attached your painting estimate from A-Frame Painting.</p>
              <ul>
                <li><strong>Project:</strong> ${emailData.projectTitle}</li>
                <li><strong>Estimate Total:</strong> <span style="color: #059669; font-weight: bold;">$${emailData.totalAmount}</span></li>
              </ul>
              <p>This estimate is valid for 30 days. If you have any questions or would like to proceed with the project, please don't hesitate to contact us.</p>
              <p>Thank you for considering A-Frame Painting for your project.</p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc;">
                <p style="margin: 0;"><strong>A-Frame Painting Team</strong></p>
                <p style="margin: 0;">cortespainter@gmail.com</p>
              </div>
            </div>
          `,
          attachments: emailData.pdfData ? [{
            filename: `Estimate-${emailData.estimateNumber}-${emailData.clientName.replace(/\s+/g, '')}.pdf`,
            content: emailData.pdfData.split(',')[1],
            mimeType: 'application/pdf'
          }] : []
        })
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
        description: "The estimate has been sent from your Gmail account.",
      });
      // Auto-close dialog after 5 seconds
      setTimeout(() => {
        onClose();
      }, 5000);
    },
    onError: async (error: Error) => {
      console.log('Gmail error:', error.message);
      
      // If Gmail OAuth is not connected, offer clipboard fallback
      if (error.message.includes('Gmail account not connected') || error.message.includes('redirect_uri_mismatch')) {
        const emailContent = `To: ${project.clientEmail || 'client@email.com'}
Subject: Painting Estimate from A-Frame Painting - EST ${estimateNumber || '001'}

Dear ${project.clientName || 'Valued Client'},

Please find your painting estimate details below:

Project: ${projectTitle || project.projectType}
Total Estimate: $${grandTotal.toFixed(2)}

Services & Labor:
${workStages.map(stage => `• ${stage.name}: ${stage.hours}h × $${stage.rate}/hr = $${(stage.hours * stage.rate).toFixed(2)}`).join('\n')}

${additionalLabor.length > 0 ? `Additional Labor:
${additionalLabor.map(labor => `• ${labor.name}: ${labor.hours}h × $${labor.rate}/hr = $${(labor.hours * labor.rate).toFixed(2)}`).join('\n')}` : ''}

${paintCosts.total > 0 ? `Paint & Materials: $${paintCosts.total.toFixed(2)}` : ''}
${supplyCosts.total > 0 ? `Supplies: $${supplyCosts.total.toFixed(2)}` : ''}
${travelCosts.total > 0 ? `Travel: $${travelCosts.total.toFixed(2)}` : ''}

Subtotal: $${subtotal.toFixed(2)}
${taxConfig.enabled ? `${taxConfig.country === 'canada' ? 'GST' : 'Tax'} (${taxConfig.rate}%): $${(subtotal * taxConfig.rate / 100).toFixed(2)}` : ''}
TOTAL: $${grandTotal.toFixed(2)}

This estimate is valid for 30 days. Please contact us with any questions.

Best regards,
A-Frame Painting Team
cortespainter@gmail.com`;

        try {
          await navigator.clipboard.writeText(emailContent);
          toast({
            title: "Gmail Setup Required",
            description: "Email content copied to clipboard. Connect Gmail in Settings for direct sending, or paste this into your email app.",
            duration: 8000,
          });
        } catch (clipboardError) {
          toast({
            title: "Gmail Connection Required",
            description: "Please connect your Gmail account in Settings to send estimates directly.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Email failed",
          description: error.message || "Failed to send estimate email. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  // Generate PDF using your HTML template
  const generatePDF = async () => {
    try {
      // Create HTML content using your exact template
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>A-FRAME Estimate</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-black text-white font-sans p-8">
    <!-- Header -->
    <div class="flex justify-between items-start border-b border-gray-700 pb-4 mb-6">
      <div>
        <img src="/logo.png" alt="A-FRAME Logo" class="h-12 mb-2" />
        <h1 class="text-2xl font-semibold">Estimate</h1>
      </div>
      <div class="text-right text-sm">
        <p><span class="text-gray-400">Estimate #</span> ${estimateNumber || 'EST-001'}</p>
        <p><span class="text-gray-400">Date:</span> ${new Date().toISOString().split('T')[0]}</p>
      </div>
    </div>

    <!-- Contact Info -->
    <div class="grid grid-cols-2 gap-4 mb-10">
      <div>
        <p class="text-gray-400 uppercase text-sm font-medium mb-1">Estimate For:</p>
        <p class="font-semibold">${clientName || 'Client Name'}</p>
        <p>${clientAddress || '123 Main St'}</p>
        <p>${clientCity || 'City'}, ${clientPostal || 'Postal Code'}</p>
        <p>${clientEmail || 'client@email.com'}</p>
      </div>
      <div class="text-right">
        <p class="text-gray-400 uppercase text-sm font-medium mb-1">From:</p>
        <p class="font-semibold">A-Frame Painting</p>
        <p>884 Hayes Rd</p>
        <p>Mansons Landing, BC</p>
        <p>cortespainter@gmail.com</p>
      </div>
    </div>

    <!-- Category Box Generator -->
    <script>
      const categories = [
        {
          title: 'Services & Labor',
          color: 'border-red-500 text-red-500',
          items: [
            { label: 'Prep', price: '$480.00' },
            { label: '8h × $60', price: '$480.00' },
            { label: 'Priming', price: '$480.00' },
            { label: '8h × $60', price: '$480.00' },
          ],
        },
        {
          title: 'Materials & Paint',
          color: 'border-yellow-400 text-yellow-400',
          items: [
            { label: 'Paint & Supplies', price: '$665.00' },
            { label: 'Delivery', price: '$50.00' },
          ],
        },
        {
          title: 'Additional Tools',
          color: 'border-green-400 text-green-400',
          items: [
            { label: 'Drop Cloths', price: '$60.00' },
          ],
        },
        {
          title: 'Project Notes',
          color: 'border-blue-400 text-blue-400',
          items: [
            { label: 'Exterior 4 Rooms', price: '' },
          ],
        },
        {
          title: 'Expenses',
          color: 'border-purple-400 text-purple-400',
          items: [
            { label: '3 receipts • Materials', price: '$63.75' },
          ],
        },
      ];
    </script>

    <div id="estimates"></div>

    <script>
      const container = document.getElementById('estimates');
      categories.forEach(cat => {
        const block = document.createElement('div');
        block.className = \`mb-8\`;

        const title = document.createElement('h2');
        title.className = \`mb-2 text-lg font-semibold \${cat.color}\`;
        title.textContent = cat.title;
        block.appendChild(title);

        const box = document.createElement('div');
        box.className = \`border rounded-md border-opacity-50 p-4 \${cat.color} bg-gray-900\`;

        cat.items.forEach(item => {
          const row = document.createElement('div');
          row.className = 'flex justify-between border-b border-gray-700 py-1';
          row.innerHTML = \`<span>\${item.label}</span><span>\${item.price}</span>\`;
          box.appendChild(row);
        });

        block.appendChild(box);
        container.appendChild(block);
      });
    </script>

    <!-- Totals Section -->
    <div class="border-t border-gray-600 pt-4">
      <div class="flex justify-between text-lg mb-2">
        <span>Subtotal:</span>
        <span>$${calculateSubtotal().toFixed(2)}</span>
      </div>
      ${calculateTaxes() > 0 ? `
      <div class="flex justify-between text-lg mb-2">
        <span>GST (${taxConfig.gst}%):</span>
        <span>$${calculateTaxes().toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="flex justify-between text-xl font-bold border-t border-gray-500 pt-2">
        <span>Estimate Total:</span>
        <span>$${calculateTotal().toFixed(2)}</span>
      </div>
    </div>
  </body>
</html>`;

      // Create a new window to render and print the HTML
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window. Please allow popups.');
      }
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print dialog
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };

      toast({
        title: 'PDF Generated',
        description: 'Estimate PDF opened for download.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate PDF.',
        variant: 'destructive',
      });
    }
  };

  // Generate PDF and send email
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
      // Generate PDF using browser's print functionality
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>A-FRAME Estimate</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-black text-white font-sans p-8">
    <!-- Header -->
    <div class="flex justify-between items-start border-b border-gray-700 pb-4 mb-6">
      <div>
        <img src="/aframe-logo.png" alt="A-FRAME Logo" class="h-12 mb-2" />
        <h1 class="text-2xl font-semibold">Estimate</h1>
      </div>
      <div class="text-right text-sm">
        <p><span class="text-gray-400">Estimate #</span> ${estimateNumber || 'EST-001'}</p>
        <p><span class="text-gray-400">Date:</span> ${new Date().toISOString().split('T')[0]}</p>
      </div>
    </div>

    <!-- Contact Info -->
    <div class="grid grid-cols-2 gap-4 mb-10">
      <div>
        <p class="text-gray-400 uppercase text-sm font-medium mb-1">Estimate For:</p>
        <p class="font-semibold">${clientName || 'Client Name'}</p>
        <p>${clientAddress || '123 Main St'}</p>
        <p>${clientCity || 'City'}, ${clientPostal || 'Postal Code'}</p>
        <p>${clientEmail || 'client@email.com'}</p>
      </div>
      <div class="text-right">
        <p class="text-gray-400 uppercase text-sm font-medium mb-1">From:</p>
        <p class="font-semibold">A-Frame Painting</p>
        <p>884 Hayes Rd</p>
        <p>Mansons Landing, BC</p>
        <p>cortespainter@gmail.com</p>
      </div>
    </div>

    <!-- Services & Labor (Red) -->
    <div class="mb-8">
      <h2 class="mb-2 text-lg font-semibold text-red-500">Services & Labor</h2>
      <div class="border-2 rounded-md border-red-500 p-4 bg-gray-900">
        ${workStages.map(stage => 
          stage.hours ? `<div class="flex justify-between border-b border-gray-700 py-1">
            <span>${stage.name} - ${stage.hours}h × $${stage.rate}/hr</span>
            <span>$${(parseFloat(stage.hours) * stage.rate).toFixed(2)}</span>
          </div>` : ''
        ).join('')}
        ${additionalLabor.map(labor => 
          labor.name && labor.hours && labor.rate ? `<div class="flex justify-between border-b border-gray-700 py-1">
            <span>${labor.name} - ${labor.hours}h × $${labor.rate}/hr</span>
            <span>$${(parseFloat(labor.hours) * parseFloat(labor.rate)).toFixed(2)}</span>
          </div>` : ''
        ).join('')}
      </div>
    </div>

    <!-- Paint & Materials (Orange) -->
    ${(primerCosts.pricePerGallon && primerCosts.gallons) || (paintCosts.pricePerGallon && paintCosts.gallons) ? `
    <div class="mb-8">
      <h2 class="mb-2 text-lg font-semibold text-orange-500">Paint & Materials</h2>
      <div class="border-2 rounded-md border-orange-500 p-4 bg-gray-900">
        ${primerCosts.pricePerGallon && primerCosts.gallons ? `<div class="flex justify-between border-b border-gray-700 py-1">
          <span>Primer (${primerCosts.gallons} gal × ${primerCosts.coats} coats)</span>
          <span>$${(parseFloat(primerCosts.pricePerGallon) * parseFloat(primerCosts.gallons) * parseFloat(primerCosts.coats)).toFixed(2)}</span>
        </div>` : ''}
        ${paintCosts.pricePerGallon && paintCosts.gallons ? `<div class="flex justify-between border-b border-gray-700 py-1">
          <span>Paint (${paintCosts.gallons} gal × ${paintCosts.coats} coats)</span>
          <span>$${(parseFloat(paintCosts.pricePerGallon) * parseFloat(paintCosts.gallons) * parseFloat(paintCosts.coats)).toFixed(2)}</span>
        </div>` : ''}
      </div>
    </div>` : ''}

    <!-- Supply Costs (Yellow) -->
    ${supplies.some(supply => supply.unitCost && supply.quantity) ? `
    <div class="mb-8">
      <h2 class="mb-2 text-lg font-semibold text-yellow-400">Supply Costs</h2>
      <div class="border-2 rounded-md border-yellow-400 p-4 bg-gray-900">
        ${supplies.map(supply => 
          supply.unitCost && supply.quantity ? `<div class="flex justify-between border-b border-gray-700 py-1">
            <span>${supply.name} (${supply.quantity} × $${supply.unitCost})</span>
            <span>$${(parseFloat(supply.unitCost) * parseFloat(supply.quantity)).toFixed(2)}</span>
          </div>` : ''
        ).join('')}
      </div>
    </div>` : ''}

    <!-- Travel Costs (Green) -->
    ${travelCosts.distance && parseFloat(travelCosts.distance) > 0 ? `
    <div class="mb-8">
      <h2 class="mb-2 text-lg font-semibold text-green-400">Travel Costs</h2>
      <div class="border-2 rounded-md border-green-400 p-4 bg-gray-900">
        <div class="flex justify-between border-b border-gray-700 py-1">
          <span>${travelCosts.distance} km × ${travelCosts.trips} trips × $${travelCosts.ratePerKm}/km</span>
          <span>$${(parseFloat(travelCosts.distance) * parseFloat(travelCosts.trips) * parseFloat(travelCosts.ratePerKm)).toFixed(2)}</span>
        </div>
      </div>
    </div>` : ''}



    <!-- Totals Section -->
    <div class="border-t border-gray-600 pt-4">
      <div class="flex justify-between text-lg mb-2">
        <span>Subtotal:</span>
        <span>$${calculateSubtotal().toFixed(2)}</span>
      </div>
      ${calculateTaxes() > 0 ? `
      <div class="flex justify-between text-lg mb-2">
        <span>GST (${taxConfig.gst}%):</span>
        <span>$${calculateTaxes().toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="flex justify-between text-xl font-bold border-t border-gray-500 pt-2">
        <span>Estimate Total:</span>
        <span>$${calculateTotal().toFixed(2)}</span>
      </div>
    </div>
  </body>
</html>`;

      // Create invisible iframe instead of popup window
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '800px';
      iframe.style.height = '600px';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Could not access iframe document');
      }

      iframeDoc.write(htmlContent);
      iframeDoc.close();
      
      // Wait for content to load
      await new Promise((resolve) => {
        iframe.onload = () => {
          setTimeout(resolve, 1000);
        };
      });

      // Capture as canvas and convert to PDF
      const canvas = await html2canvas(iframeDoc.body, {
        backgroundColor: '#000000',
        scale: 1,
        useCORS: true,
        allowTaint: true
      });

      // Clean up iframe
      document.body.removeChild(iframe);

      // Convert canvas to PDF - single page only
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.7);
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Fit content to single page
      const finalHeight = Math.min(imgHeight, pageHeight);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, finalHeight);

      // Convert PDF to base64
      const pdfData = pdf.output('datauristring');

      const emailData = {
        recipientEmail: clientEmail,
        clientName: clientName || 'Client',
        estimateNumber: estimateNumber || 'EST-001',
        projectTitle: projectTitle || 'Painting Estimate',
        totalAmount: calculateTotal().toFixed(2),
        customMessage: '',
        pdfData: pdfData
      };

      await sendGmailMutation.mutateAsync(emailData);
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
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold mb-4">Generate Estimate</DialogTitle>
            <Button 
              onClick={clearFormData}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Clear Form
            </Button>
          </div>
        </DialogHeader>

        <div
          ref={printRef}
          className="overflow-y-auto max-h-[calc(100vh-160px)] pr-2"
        >
          {/* Client Info (read-only) */}
          <Card className="mb-4 border-2 border-[#D4A574]">
            <CardHeader>
              <CardTitle className="text-lg text-[#D4A574]">Client Information</CardTitle>
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
          <Card className="mb-4 border-2 border-[#569CD6]">
            <CardHeader>
              <CardTitle className="text-lg text-[#569CD6]">Estimate Details</CardTitle>
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
          <Card className="mb-4 border-2 border-[#6A9955]">
            <CardHeader className="flex justify-between items-center">
              <CardTitle className="text-lg text-[#6A9955]">Work Breakdown</CardTitle>
              <Button size="sm" onClick={addWorkStage} className="bg-[#6A9955] hover:bg-[#5a8245]">+ Add Stage</Button>
            </CardHeader>
            <CardContent>
              {workStages.map((stage, i) => (
                <div
                  key={i}
                  className="mb-3 border-2 border-[#6A9955] bg-[#6A9955]/10 rounded p-3"
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
              {additionalLabor.map((member, i) => (
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
          <Card className="mb-4 border-2 border-[#DCDCAA]">
            <CardHeader>
              <CardTitle className="text-lg text-[#DCDCAA]">Supply Costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primer Costs */}
              <div className="border border-[#DCDCAA] rounded p-3 bg-[#DCDCAA]/10">
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
              <div className="border border-[#DCDCAA] rounded p-3 bg-[#DCDCAA]/10">
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
                {supplies.map((supply, i) => (
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
          <Card className="mb-4 border-2 border-[#FF6B6B]">
            <CardHeader>
              <CardTitle className="text-lg text-[#FF6B6B]">Travel Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-[#FF6B6B] rounded p-3 bg-[#FF6B6B]/10">
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
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-3">
          <div className="flex justify-between gap-2 items-end">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <div className="flex flex-col items-center gap-2">
              {/* Toggle Switch - positioned over send email button */}
              <div className="relative inline-flex items-center">
                <button
                  onClick={() => setActionMode(actionMode === 'email' ? 'download' : 'email')}
                  className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    actionMode === 'email' ? 'bg-[#569CD6]' : 'bg-[#6A9955]'
                  }`}
                >
                  <span
                    className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform duration-200 ${
                      actionMode === 'email' ? 'translate-x-1' : 'translate-x-11'
                    }`}
                  />
                  <Mail 
                    className={`absolute left-2 h-4 w-4 transition-opacity duration-200 ${
                      actionMode === 'email' ? 'text-white opacity-100' : 'text-white opacity-60'
                    }`} 
                    style={{ color: '#FFFFFF' }}
                  />
                  <Download 
                    className={`absolute right-2 h-4 w-4 transition-opacity duration-200 ${
                      actionMode === 'download' ? 'text-white opacity-100' : 'text-white opacity-60'
                    }`} 
                    style={{ color: '#FFFFFF' }}
                  />
                </button>
              </div>
              
              {/* Action Button */}
              {actionMode === 'email' ? (
                <Button 
                  onClick={sendEstimateEmail} 
                  className="bg-[#569CD6] hover:bg-[#4a8bc2] min-w-[120px]"
                  disabled={sendGmailMutation.isPending}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {sendGmailMutation.isPending ? 'Sending...' : 'Send Email'}
                </Button>
              ) : (
                <Button onClick={generatePDF} className="bg-[#6A9955] hover:bg-[#5a8245] min-w-[120px]">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}