import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Download, Send, Calculator } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Project } from '@shared/schema';

interface WorkStage {
  name: string;
  description: string;
  hours: number;
  rate: number;
  total: number;
}

interface AdditionalService {
  name: string;
  hours: number;
  rate: number;
  total: number;
  included: boolean;
}

interface EstimateData {
  // Client Information
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientPostal: string;
  clientEmail: string;
  clientPhone: string;

  // Estimate Details
  estimateNumber: string;
  date: string;
  projectTitle: string;
  projectDescription: string;

  // Work Breakdown
  workStages: WorkStage[];
  additionalServices: AdditionalService[];

  // Paint Details
  primerCoats: number;
  topCoats: number;
  paintSuppliedBy: 'contractor' | 'client';
  paintCost: number;
  deliveryCost: number;

  // Custom Message
  customMessage: string;
}

interface EstimateGeneratorProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

const darkTheme = {
  bg: '#1a1a1a',
  cardBg: '#2a2a2a',
  inputBg: '#3a3a3a',
  border: '#4a4a4a',
  text: '#ffffff',
  textSecondary: '#cccccc',
  accent: '#10b981',
};

const fontStyles = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

export default function EstimateGenerator({ project, isOpen, onClose }: EstimateGeneratorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch daily hours data to calculate actual labor costs
  const { data: dailyHours = [] } = useQuery({
    queryKey: [`/api/projects/${project.id}/hours`],
    enabled: isOpen && !!project.id,
  });

  // Email sending mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: { 
      clientEmail: string; 
      clientName: string; 
      estimateNumber: string; 
      pdfBuffer: Buffer 
    }) => {
      const response = await fetch('/api/send-estimate-email', {
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
      console.error('Email sending failed:', error);
      toast({
        title: "Email failed",
        description: error.message || "Failed to send estimate email. Please try again.",
        variant: "destructive",
      });
    }
  });

  const [estimateData, setEstimateData] = useState<EstimateData>({
    // Client Information from project
    clientName: project.clientName || '',
    clientAddress: project.address || '',
    clientCity: project.clientCity || '',
    clientPostal: project.clientPostal || '',
    clientEmail: project.clientEmail || '',
    clientPhone: project.clientPhone || '',

    // Estimate Details
    estimateNumber: '',
    date: new Date().toISOString().split('T')[0],
    projectTitle: '',
    projectDescription: project.notes || '',

    // Default Work Stages - simplified
    workStages: [
      {
        name: 'Prep',
        description: '',
        hours: 0,
        rate: 60,
        total: 0,
      },
      {
        name: 'Priming',
        description: '',
        hours: 0,
        rate: 60,
        total: 0,
      },
      {
        name: 'Painting',
        description: '',
        hours: 0,
        rate: 60,
        total: 0,
      },
    ],

    // Additional Services
    additionalServices: [
      {
        name: 'Power Washing',
        hours: 0,
        rate: 100,
        total: 0,
        included: false,
      },
      {
        name: 'Wood Reconditioning',
        hours: 0,
        rate: 60,
        total: 0,
        included: false,
      },
      {
        name: 'Drywall Repair',
        hours: 0,
        rate: 60,
        total: 0,
        included: false,
      },
    ],

    // Paint Details
    primerCoats: 0,
    topCoats: 0,
    paintSuppliedBy: 'contractor',
    paintCost: 0,
    deliveryCost: 0,

    // Custom Message
    customMessage: '',
  });

  // Calculate labor subtotal from actual daily hours
  const calculateLaborFromDailyHours = () => {
    if (!dailyHours || !Array.isArray(dailyHours) || dailyHours.length === 0) return 0;
    return dailyHours.reduce((total: number, entry: any) => total + (entry.hours * 60), 0);
  };

  // Calculate functions
  const calculateSubtotal = () => {
    // Use actual daily hours if available, otherwise use manual work stages
    const laborFromDailyHours = calculateLaborFromDailyHours();
    const workStagesTotal = estimateData.workStages.reduce((sum, stage) => sum + stage.total, 0);
    const additionalServicesTotal = estimateData.additionalServices.filter(s => s.included).reduce((sum, service) => sum + service.total, 0);
    
    const laborTotal = laborFromDailyHours > 0 ? laborFromDailyHours : workStagesTotal;
    
    if (estimateData.paintSuppliedBy === 'contractor') {
      return laborTotal + additionalServicesTotal + estimateData.paintCost + estimateData.deliveryCost;
    }
    return laborTotal + additionalServicesTotal;
  };

  const calculateGST = () => calculateSubtotal() * 0.05;
  const calculateTotal = () => calculateSubtotal() + calculateGST();

  // Update work stage
  const updateWorkStage = (index: number, field: keyof WorkStage, value: string | number) => {
    const newStages = [...estimateData.workStages];
    newStages[index] = { ...newStages[index], [field]: value };
    
    if (field === 'hours' || field === 'rate') {
      newStages[index].total = newStages[index].hours * newStages[index].rate;
    }
    
    setEstimateData({ ...estimateData, workStages: newStages });
  };

  // Add new work stage
  const addWorkStage = () => {
    setEstimateData({
      ...estimateData,
      workStages: [
        ...estimateData.workStages,
        { name: '', description: '', hours: 0, rate: 60, total: 0 }
      ]
    });
  };

  // Remove work stage
  const removeWorkStage = (index: number) => {
    setEstimateData({
      ...estimateData,
      workStages: estimateData.workStages.filter((_, i) => i !== index)
    });
  };

  // Toggle additional service
  const toggleAdditionalService = (index: number) => {
    const newServices = [...estimateData.additionalServices];
    newServices[index].included = !newServices[index].included;
    setEstimateData({ ...estimateData, additionalServices: newServices });
  };

  // Update additional service hours
  const updateAdditionalServiceHours = (index: number, hours: number) => {
    const newServices = [...estimateData.additionalServices];
    newServices[index].hours = hours;
    newServices[index].total = hours * newServices[index].rate;
    setEstimateData({ ...estimateData, additionalServices: newServices });
  };

  // Generate PDF for download
  const generatePDF = async () => {
    if (!printRef.current) return;

    try {
      // Temporarily make the element visible for proper rendering
      const element = printRef.current;
      element.style.visibility = 'visible';
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';

      // Wait a moment for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000000',
        logging: false,
        width: 794, // Standard width
      });

      // Hide the element again
      element.style.visibility = 'hidden';

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate exact dimensions based on content
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF with exact content height to avoid extra pages
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, Math.min(imgHeight, 295)] // Cap at A4 height but use actual content height
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      const filename = `Estimate-${estimateData.estimateNumber}-${estimateData.clientName.replace(/\s+/g, '-')}.pdf`;
      
      // Get PDF as blob for better mobile compatibility
      const pdfBlob = pdf.output('blob');
      
      // Enhanced mobile-friendly download
      try {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        
        // Enhanced mobile compatibility with better iOS handling
        if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
          // iOS Safari specific handling
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = url;
          document.body.appendChild(iframe);
          
          // Also open in new tab as backup
          setTimeout(() => {
            window.open(url, '_blank');
            document.body.removeChild(iframe);
          }, 500);
        } else {
          // Standard download for other devices
          a.click();
        }
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "✅ PDF Generated",
          description: navigator.userAgent.match(/iPhone|iPad|iPod/i) 
            ? "PDF opened in new tab - you can save from there"
            : "Estimate PDF has been downloaded",
          duration: 4000,
        });
      } catch (downloadError) {
        console.error('Download failed:', downloadError);
        // Mobile fallback - display PDF in new window
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
        
        toast({
          title: "✅ PDF Generated",
          description: "PDF opened in new tab - tap Share → Save to Files",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  // Generate PDF and send email with attachment
  const sendEstimateEmail = async () => {
    if (!estimateData.clientEmail || !estimateData.clientEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please add client email to send estimate",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Preparing Email",
        description: "Generating PDF and preparing email...",
      });

      // Generate PDF first and get it as base64
      const pdfBlob = await generatePDFBlob();
      
      if (pdfBlob) {
        // Convert to base64 for server sending
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Result = reader.result?.toString();
          if (!base64Result) {
            console.error('Failed to convert PDF to base64');
            toast({
              title: "Error",
              description: "Failed to process PDF for email",
              variant: "destructive",
            });
            return;
          }

          const pdfBase64 = base64Result.split(',')[1];
          if (!pdfBase64 || pdfBase64.length === 0) {
            console.error('Invalid PDF base64 data');
            toast({
              title: "Error", 
              description: "Invalid PDF data generated",
              variant: "destructive",
            });
            return;
          }

          const pdfFilename = `Estimate-${estimateData.estimateNumber || 'EST'}-${estimateData.clientName.replace(/\s+/g, '-')}.pdf`;
          
          // Try nodemailer Gmail endpoint
          try {
            // Ensure all required fields have values
            const emailData = {
              recipientEmail: estimateData.clientEmail,
              clientName: estimateData.clientName || 'Client',
              estimateNumber: estimateData.estimateNumber || 'EST-001',
              projectTitle: estimateData.projectTitle || 'Painting Estimate',
              totalAmount: calculateTotal().toFixed(2),
              customMessage: estimateData.customMessage || '',
              pdfData: pdfBase64
            };

            // Debug logging
            console.log('Sending estimate email with data:', {
              recipientEmail: emailData.recipientEmail,
              clientName: emailData.clientName,
              estimateNumber: emailData.estimateNumber,
              projectTitle: emailData.projectTitle,
              hasPdfData: !!emailData.pdfData
            });

            const response = await fetch('/api/send-estimate-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(emailData)
            });

            console.log('Email response status:', response.status);
            const result = await response.json();
            console.log('Email response result:', result);
            
            if (response.ok && result.success) {
              console.log('Showing success toast notification');
              
              // Show automatic toast notification that disappears on its own
              toast({
                title: "✅ Email Sent Successfully!",
                description: `Estimate PDF sent to ${estimateData.clientEmail}`,
                duration: 4000,
                className: "bg-green-500 text-white border-green-600",
              });
              
              // Also update button text temporarily  
              const button = document.querySelector('[data-send-email-btn]') as HTMLButtonElement;
              if (button) {
                const originalText = button.textContent;
                button.textContent = "✅ Email Sent!";
                button.className = button.className.replace('bg-green-600', 'bg-green-500').replace('hover:bg-green-700', 'hover:bg-green-600');
                setTimeout(() => {
                  button.textContent = originalText;
                  button.className = button.className.replace('bg-green-500', 'bg-green-600').replace('hover:bg-green-600', 'hover:bg-green-700');
                }, 3000);
              }
              
              // Close the dialog after successful send
              setTimeout(() => {
                onClose();
              }, 3000);
            } else {
              console.error('Email failed with result:', result);
              throw new Error(result.error || 'Failed to send email');
            }
            
          } catch (emailError) {
            console.error('Email sending failed:', emailError);
            
            // Fallback - improved mobile-friendly PDF download
            try {
              const url = URL.createObjectURL(pdfBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = pdfFilename;
              a.style.display = 'none';
              document.body.appendChild(a);
              
              // Enhanced mobile compatibility
              a.click();
              
              // For iOS Safari - open PDF in new tab if download fails
              setTimeout(() => {
                if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
                  window.open(url, '_blank');
                }
              }, 100);
              
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } catch (downloadError) {
              console.error('Download failed:', downloadError);
              // Mobile fallback - display PDF in new window
              const url = URL.createObjectURL(pdfBlob);
              window.open(url, '_blank');
            }
            
            // Copy email content to clipboard
            const emailContent = `Subject: Painting Estimate ${estimateData.estimateNumber} - ${estimateData.projectTitle}

Dear ${estimateData.clientName},

Please find attached your painting estimate for ${estimateData.projectTitle}.
${estimateData.customMessage ? `\n${estimateData.customMessage}\n` : ''}
Total Estimate: $${calculateTotal().toFixed(2)}

This estimate is valid for 30 days. Please let me know if you have any questions.

Best regards,
A-Frame Painting
cortespainter@gmail.com`;

            navigator.clipboard.writeText(emailContent).then(() => {
              toast({
                title: "Email content copied to clipboard",
                description: "PDF downloaded. Paste email content into Gmail manually.",
              });
            });
          }
        };
        reader.readAsDataURL(pdfBlob);
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({
        title: "Error",
        description: "Failed to generate estimate PDF",
        variant: "destructive",
      });
    }
  };

  // Generate PDF blob for email attachment
  const generatePDFBlob = async (): Promise<Blob | null> => {
    if (!printRef.current) return null;

    try {
      // Temporarily make the element visible for proper rendering
      const element = printRef.current;
      element.style.visibility = 'visible';
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';

      // Wait a moment for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Calculate actual content height to minimize white space
      const contentHeight = Math.min(
        element.scrollHeight,
        element.offsetHeight,
        element.clientHeight
      );

      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000000',
        logging: false,
        height: contentHeight + 50, // Add minimal padding
        width: 794, // Standard width
      });

      // Hide the element again
      element.style.visibility = 'hidden';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      return pdf.output('blob');
    } catch (error) {
      console.error('PDF generation error:', error);
      return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-screen overflow-y-auto bg-white dark:bg-gray-900" style={fontStyles}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">Generate Estimate</DialogTitle>
        </DialogHeader>

        {/* Main Content - Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Client Name</label>
                    <Input
                      value={estimateData.clientName}
                      onChange={(e) => setEstimateData({...estimateData, clientName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Email</label>
                    <Input
                      type="email"
                      value={estimateData.clientEmail}
                      onChange={(e) => setEstimateData({...estimateData, clientEmail: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Address</label>
                  <Input
                    value={estimateData.clientAddress}
                    onChange={(e) => setEstimateData({...estimateData, clientAddress: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">City</label>
                    <Input
                      value={estimateData.clientCity}
                      onChange={(e) => setEstimateData({...estimateData, clientCity: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Postal Code</label>
                    <Input
                      value={estimateData.clientPostal}
                      onChange={(e) => setEstimateData({...estimateData, clientPostal: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Phone</label>
                    <Input
                      value={estimateData.clientPhone}
                      onChange={(e) => setEstimateData({...estimateData, clientPhone: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estimate Details */}
            <Card>
              <CardHeader>
                <CardTitle>Estimate Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Project Title</label>
                    <Input
                      value={estimateData.projectTitle}
                      onChange={(e) => setEstimateData({...estimateData, projectTitle: e.target.value})}
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Date</label>
                    <Input
                      type="date"
                      value={estimateData.date}
                      onChange={(e) => setEstimateData({...estimateData, date: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Work Stages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Work Breakdown
                  <Button size="sm" onClick={addWorkStage} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Stage
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {estimateData.workStages.map((stage, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <Input
                        value={stage.name}
                        onChange={(e) => updateWorkStage(index, 'name', e.target.value)}
                        placeholder="Stage name"
                        className="font-medium"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeWorkStage(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={stage.description}
                      onChange={(e) => updateWorkStage(index, 'description', e.target.value)}
                      placeholder="Description of work"
                      rows={2}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block">Hours</label>
                        <Input
                          type="number"
                          value={stage.hours === 0 ? '' : stage.hours}
                          onChange={(e) => updateWorkStage(index, 'hours', parseFloat(e.target.value) || 0)}
                          step="0.5"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Rate/Hour</label>
                        <Input
                          type="number"
                          value={stage.rate}
                          onChange={(e) => updateWorkStage(index, 'rate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Total</label>
                        <Input
                          value={`$${stage.total.toFixed(2)}`}
                          readOnly
                          className="bg-gray-100 dark:bg-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Paint Details */}
            <Card>
              <CardHeader>
                <CardTitle>Paint & Materials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Primer Coats</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={estimateData.primerCoats === 0 ? '' : estimateData.primerCoats}
                      onChange={(e) => setEstimateData({...estimateData, primerCoats: parseInt(e.target.value) || 0})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Top Coats</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={estimateData.topCoats === 0 ? '' : estimateData.topCoats}
                      onChange={(e) => setEstimateData({...estimateData, topCoats: parseInt(e.target.value) || 0})}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Paint and Supplies</label>
                  <Select
                    value={estimateData.paintSuppliedBy}
                    onValueChange={(value: 'contractor' | 'client') => setEstimateData({...estimateData, paintSuppliedBy: value})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="contractor">A-Frame</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {estimateData.paintSuppliedBy === 'contractor' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Paint Cost</label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={estimateData.paintCost === 0 ? '' : estimateData.paintCost}
                        onChange={(e) => setEstimateData({...estimateData, paintCost: parseFloat(e.target.value) || 0})}
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Delivery Cost</label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={estimateData.deliveryCost === 0 ? '' : estimateData.deliveryCost}
                        onChange={(e) => setEstimateData({...estimateData, deliveryCost: parseFloat(e.target.value) || 0})}
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Services */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {estimateData.additionalServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center space-x-3 flex-1">
                      <input
                        type="checkbox"
                        checked={service.included}
                        onChange={() => toggleAdditionalService(index)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 text-left">
                          ${service.rate}/hr
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAdditionalServiceHours(index, Math.max(0, service.hours - 0.5))}
                          className="h-6 w-6 p-0"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{service.hours}h</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAdditionalServiceHours(index, service.hours + 0.5)}
                          className="h-6 w-6 p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <div className="font-medium ml-4">${service.total.toFixed(2)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Live Preview */}
          <div className="space-y-4">
            <div className="sticky top-4">
              {/* Summary Card */}
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    Estimate Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{calculateLaborFromDailyHours() > 0 ? 'Labor (from logged hours):' : 'Labor Subtotal:'}</span>
                      <span className="font-medium">
                        ${calculateLaborFromDailyHours() > 0 ? 
                          calculateLaborFromDailyHours().toFixed(2) : 
                          (estimateData.workStages.reduce((sum, stage) => sum + stage.total, 0) + 
                           estimateData.additionalServices.filter(s => s.included).reduce((sum, service) => sum + service.total, 0)).toFixed(2)}
                      </span>
                    </div>
                    {estimateData.paintSuppliedBy === 'contractor' && (
                      <>
                        <div className="flex justify-between">
                          <span>Paint & Materials:</span>
                          <span className="font-medium">${estimateData.paintCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery:</span>
                          <span className="font-medium">${estimateData.deliveryCost.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between border-t pt-2">
                      <span>Subtotal:</span>
                      <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (5%):</span>
                      <span className="font-medium">${calculateGST().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold bg-green-50 dark:bg-green-900/20 p-3 rounded">
                      <span>Total Estimate:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Maximum (w/ 20% buffer):</span>
                      <span>${(calculateTotal() * 1.2).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Custom Message */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Custom Message (optional)</label>
                <Textarea
                  placeholder="Add a personal note to include with the estimate..."
                  value={estimateData.customMessage}
                  onChange={(e) => setEstimateData({...estimateData, customMessage: e.target.value})}
                  className="min-h-20"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={generatePDF}
                  className="flex items-center bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Generate PDF
                </Button>
                <Button
                  onClick={sendEstimateEmail}
                  disabled={!estimateData.clientEmail}
                  className="flex items-center bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                  data-send-email-btn
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Estimate
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden Print Version - Professional Template */}
        <div
          ref={printRef}
          className="absolute left-[-9999px]"
          style={{ 
            visibility: 'hidden',
            fontFamily: 'Inter, sans-serif',
            background: '#1a1a1a',
            color: '#ffffff',
            lineHeight: '1.4',
            width: '8.5in',
            minHeight: 'auto',
            padding: '30px'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            {/* Logo Section */}
            <div>
              <img src="/aframe-logo.png" alt="A-Frame Painting" style={{ height: '48px', marginBottom: '8px' }} />
              <p style={{ fontSize: '12px', color: '#ffffff', letterSpacing: '1px', fontWeight: '500' }}>PAINTING</p>
            </div>
            
            {/* Estimate Title */}
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#f97316', marginBottom: '6px' }}>Estimate</h2>
              <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                <p style={{ marginBottom: '3px' }}><strong>Estimate #:</strong> {estimateData.estimateNumber}</p>
                <p><strong>Date:</strong> {new Date(estimateData.date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            {/* Estimate From */}
            <div style={{ background: '#374151', borderRadius: '6px', padding: '15px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#d1d5db', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estimate From:</h3>
              <p style={{ fontSize: '13px', marginBottom: '3px', color: '#ffffff', lineHeight: '1.3' }}><strong>A-Frame Painting</strong></p>
              <p style={{ fontSize: '13px', marginBottom: '3px', color: '#ffffff' }}>884 Hayes Rd</p>
              <p style={{ fontSize: '13px', marginBottom: '3px', color: '#ffffff' }}>Manson's Landing, BC V0P1K0</p>
              <p style={{ fontSize: '13px', marginBottom: '3px', color: '#ffffff' }}>cortespainter@gmail.com</p>
            </div>
            
            {/* Estimate To */}
            <div style={{ background: '#374151', borderRadius: '6px', padding: '15px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#d1d5db', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estimate To:</h3>
              <p style={{ fontSize: '13px', marginBottom: '3px', color: '#ffffff', lineHeight: '1.3' }}><strong>{estimateData.clientName}</strong></p>
              <p style={{ fontSize: '13px', marginBottom: '3px', color: '#ffffff' }}>{estimateData.clientAddress}</p>
              <p style={{ fontSize: '13px', marginBottom: '3px', color: '#ffffff' }}>{estimateData.clientCity}, {estimateData.clientPostal}</p>
              <p style={{ fontSize: '13px', marginBottom: '3px', color: '#ffffff' }}>{estimateData.clientEmail}</p>
              <p style={{ fontSize: '13px', marginBottom: '3px', color: '#ffffff' }}>{estimateData.clientPhone}</p>
            </div>
          </div>

          {/* Work Breakdown */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f97316', marginBottom: '12px' }}>Work Breakdown</h3>
            
            {/* Work Stages */}
            {estimateData.workStages.map((stage, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #374151', fontSize: '13px' }}>
                <span style={{ color: '#e5e7eb', fontWeight: '500' }}>{stage.name}</span>
                <span style={{ color: '#9ca3af', fontSize: '12px', marginRight: 'auto', marginLeft: '15px' }}>{stage.hours}h × ${stage.rate}/h</span>
                <span style={{ color: '#ffffff', fontWeight: '600', textAlign: 'right', minWidth: '70px' }}>${stage.total.toFixed(2)}</span>
              </div>
            ))}

            {/* Additional Services */}
            {estimateData.additionalServices.filter(service => service.included).map((service, index) => (
              <div key={`additional-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #374151', fontSize: '13px' }}>
                <span style={{ color: '#e5e7eb', fontWeight: '500' }}>{service.name}</span>
                <span style={{ color: '#9ca3af', fontSize: '12px', marginRight: 'auto', marginLeft: '15px' }}>{service.hours}h × ${service.rate}/h</span>
                <span style={{ color: '#ffffff', fontWeight: '600', textAlign: 'right', minWidth: '70px' }}>${service.total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals Section */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: '13px', borderTop: '1px solid #374151', paddingTop: '10px', marginTop: '15px' }}>
              <span style={{ color: '#d1d5db', fontWeight: '500' }}>Subtotal:</span>
              <span style={{ color: '#ffffff', fontWeight: '600', textAlign: 'right', minWidth: '80px' }}>${calculateSubtotal().toFixed(2)}</span>
            </div>
            
            {(estimateData.paintCost > 0 || estimateData.deliveryCost > 0) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: '13px' }}>
                <span style={{ color: '#d1d5db', fontWeight: '500' }}>Paint & Materials:</span>
                <span style={{ color: '#ffffff', fontWeight: '600', textAlign: 'right', minWidth: '80px' }}>${(estimateData.paintCost + estimateData.deliveryCost).toFixed(2)}</span>
              </div>
            )}
            
            {/* Grand Total */}
            <div style={{ background: '#10b981', color: '#ffffff', padding: '10px 15px', borderRadius: '6px', marginTop: '10px', fontSize: '16px', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Grand Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #374151', textAlign: 'center' }}>
            {/* Disclaimer */}
            <p style={{ color: '#f97316', fontSize: '11px', fontWeight: '600', lineHeight: '1.4' }}>
              <strong>NOTE:</strong> This is an estimate only. Price excludes structural repairs discovered during work (charged hourly). If total cost may exceed estimate by 20%+, you'll be notified for approval first.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}