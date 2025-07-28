import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Download, Mail, Plus, Trash2, Calendar } from 'lucide-react';
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

  // Clear any old date data from localStorage on component mount
  useEffect(() => {
    const clearOldDateData = () => {
      try {
        const saved = localStorage.getItem('estimateFormData');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.estimateDate) {
            delete data.estimateDate;
            localStorage.setItem('estimateFormData', JSON.stringify(data));
          }
        }
      } catch (error) {
        console.log('Error cleaning old date data:', error);
      }
    };
    clearOldDateData();
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

  // Toggle state for action buttons
  const [actionMode, setActionMode] = useState<'download' | 'email'>('email');

  // Save form data to localStorage whenever state changes (excluding date)
  useEffect(() => {
    const formData = {
      projectTitle,
      // Exclude estimateDate from saving to ensure current date is always used
      workStages,
      paintCosts,
      additionalServices,
      additionalLabor
    };
    localStorage.setItem('estimateFormData', JSON.stringify(formData));
  }, [projectTitle, workStages, paintCosts, additionalServices, additionalLabor]);

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

  // Update work stage
  const updateWorkStage = (index: number, field: string, value: string) => {
    const updated = [...workStages];
    updated[index] = { ...updated[index], [field]: value };
    setWorkStages(updated);
  };

  // Update additional service
  const updateAdditionalService = (index: number, field: string, value: string) => {
    const updated = [...additionalServices];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalServices(updated);
  };

  // Update additional labor (crew member)
  const updateAdditionalLabor = (index: number, field: string, value: string) => {
    const updated = [...additionalLabor];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalLabor(updated);
  };

  // Add new crew member
  const addLabor = () => {
    setAdditionalLabor([...additionalLabor, { name: '', hours: '', rate: '' }]);
  };

  // Remove crew member
  const removeLabor = (index: number) => {
    if (additionalLabor.length > 1) {
      setAdditionalLabor(additionalLabor.filter((_: any, i: number) => i !== index));
    }
  };

  // Add new additional service
  const addAdditionalService = () => {
    setAdditionalServices([...additionalServices, { name: '', hours: '', rate: 60 }]);
  };

  // Remove additional service (protect the first 3 default services)
  const removeAdditionalService = (index: number) => {
    if (additionalServices.length > 3 && index >= 3) {
      setAdditionalServices(additionalServices.filter((_: any, i: number) => i !== index));
    }
  };

  // Calculate totals
  const laborSubtotal = workStages.reduce((sum: number, stage: any) => {
    const hours = parseFloat(stage.hours) || 0;
    const rate = parseFloat(stage.rate.toString()) || 0;
    return sum + (hours * rate);
  }, 0);

  const additionalServicesSubtotal = additionalServices.reduce((sum: number, service: any) => {
    const hours = parseFloat(service.hours) || 0;
    const rate = parseFloat(service.rate.toString()) || 0;
    return sum + (hours * rate);
  }, 0);

  const additionalLaborSubtotal = additionalLabor.reduce((sum: number, member: any) => {
    const hours = parseFloat(member.hours) || 0;
    const rate = parseFloat(member.rate.toString()) || 0;
    return sum + (hours * rate);
  }, 0);

  const paintSubtotal = (parseFloat(paintCosts.pricePerGallon) || 0) * 
                       (parseFloat(paintCosts.gallons) || 0) * 
                       (parseFloat(paintCosts.coats) || 1);

  const subtotal = laborSubtotal + additionalServicesSubtotal + additionalLaborSubtotal + paintSubtotal;
  const taxAmount = subtotal * (taxConfig.gst + taxConfig.pst + taxConfig.hst + taxConfig.salesTax + taxConfig.vat + taxConfig.otherTax) / 100;
  const grandTotal = subtotal + taxAmount;

  // Email mutation
  const emailMutation = useMutation({
    mutationFn: async (pdfData: string) => {
      return apiRequest('/api/send-estimate-email', {
        method: 'POST',
        body: JSON.stringify({
          to: project.clientEmail,
          clientName: project.clientName,
          projectTitle: projectTitle || `${project.projectType} Project`,
          pdfData: pdfData,
          grandTotal: grandTotal
        })
      });
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

  const generatePDF = async (sendEmail = false) => {
    if (!printRef.current) return;

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#000000',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      if (sendEmail) {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        emailMutation.mutate(pdfBase64);
      } else {
        pdf.save(`estimate-${project.clientName.replace(/\s+/g, '-')}.pdf`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
      console.error('PDF generation error:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#8B5FBF]">
            Generate Estimate - {project.clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estimate Details */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-[#8B5FBF]">Estimate Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Project Title</label>
                  <Input
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Enter project title"
                    className="bg-gray-800 border-[#8B5FBF] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <div className="relative">
                    <Button
                      type="button"
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="w-full bg-gray-800 border-[#8B5FBF] text-white hover:bg-gray-700 justify-start"
                      variant="outline"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {estimateDate ? new Date(estimateDate).toLocaleDateString() : 'Select date'}
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
            </CardContent>
          </Card>

          {/* Services & Labor */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-[#E53E3E]">Services & Labor</CardTitle>
            </CardHeader>
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
                      className="bg-gray-700 border-[#E53E3E] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Rate/Hour</label>
                    <Input
                      type="number"
                      min="0"
                      value={stage.rate}
                      onChange={(e) => updateWorkStage(index, 'rate', e.target.value)}
                      className="bg-gray-700 border-[#E53E3E] text-white"
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
          </Card>

          {/* Paint & Materials */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-[#D4A574]">Paint & Materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-800 rounded-lg">
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
                    className="bg-gray-700 border-[#D4A574] text-white"
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
                    className="bg-gray-700 border-[#D4A574] text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Coats</label>
                  <Select 
                    value={paintCosts.coats} 
                    onValueChange={(value) => setPaintCosts((prev: any) => ({ ...prev, coats: value }))}
                  >
                    <SelectTrigger className="bg-gray-700 border-[#D4A574] text-white">
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
            </CardContent>
          </Card>

          {/* Additional Labor (Crew Members) */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[#4ECDC4]">Additional Labor</CardTitle>
              <Button
                onClick={addLabor}
                size="sm"
                className="bg-[#4ECDC4] hover:bg-[#3EB8B8] text-black"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Crew Member
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {additionalLabor.map((member: any, index: number) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-800 rounded-lg border border-[#4ECDC4]">
                  <div>
                    <label className="block text-sm font-medium mb-2">Crew Member Name</label>
                    <Input
                      value={member.name}
                      onChange={(e) => updateAdditionalLabor(index, 'name', e.target.value)}
                      placeholder="Enter name"
                      className="bg-gray-700 border-[#4ECDC4] text-white"
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
                      className="bg-gray-700 border-[#4ECDC4] text-white"
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
                      className="bg-gray-700 border-[#4ECDC4] text-white"
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
              <div className="text-right text-lg font-semibold text-[#4ECDC4]">
                Additional Labor Total: ${additionalLaborSubtotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          {/* Additional Services */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[#DCDCAA]">Additional Services</CardTitle>
              <Button
                onClick={addAdditionalService}
                size="sm"
                className="bg-[#DCDCAA] hover:bg-[#C7C594] text-black px-3 py-1"
              >
                <Plus className="w-5 h-5 mr-1" />
                Services
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {additionalServices.map((service: any, index: number) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-800 rounded-lg border border-[#DCDCAA]">
                  <div>
                    <label className="block text-sm font-medium mb-2">Service Name</label>
                    <Input
                      value={service.name}
                      onChange={(e) => updateAdditionalService(index, 'name', e.target.value)}
                      placeholder="Enter service name"
                      className="bg-gray-700 border-[#DCDCAA] text-white"
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
                      className="bg-gray-700 border-[#DCDCAA] text-white"
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
                      className="bg-gray-700 border-[#DCDCAA] text-white"
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
              <div className="text-right text-lg font-semibold text-[#DCDCAA]">
                Additional Services: ${additionalServicesSubtotal.toFixed(2)}
              </div>
            </CardContent>
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
              {paintSubtotal > 0 && (
                <div className="flex justify-between">
                  <span>Paint & Materials:</span>
                  <span>${paintSubtotal.toFixed(2)}</span>
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => generatePDF(false)}
              className="bg-[#8B5FBF] hover:bg-[#7A4FAF] text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button
              onClick={() => generatePDF(true)}
              disabled={emailMutation.isPending}
              className="bg-[#6A9955] hover:bg-[#5A8245] text-white"
            >
              <Mail className="w-4 h-4 mr-2" />
              {emailMutation.isPending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>

        {/* Hidden PDF Template */}
        <div 
          ref={printRef} 
          className="fixed -left-[9999px] w-[210mm] bg-black p-8 text-white"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          <div className="text-center mb-8">
            <img 
              src="/aframe-logo.png" 
              alt="A-Frame Painting" 
              className="mx-auto mb-4 h-16"
            />
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
              <h3 className="text-lg font-semibold text-[#E53E3E] mb-4 border-b border-[#E53E3E] pb-2">
                Services & Labor
              </h3>
              {workStages.filter((stage: any) => parseFloat(stage.hours) > 0).map((stage: any, index: number) => (
                <div key={index} className="flex justify-between mb-2">
                  <span>{stage.name} ({stage.hours} hrs @ ${stage.rate}/hr)</span>
                  <span>${((parseFloat(stage.hours) || 0) * (parseFloat(stage.rate.toString()) || 0)).toFixed(2)}</span>
                </div>
              ))}
              <div className="text-right font-semibold text-[#6A9955] mt-2">
                Labor Subtotal: ${laborSubtotal.toFixed(2)}
              </div>
            </div>
          )}

          {/* Paint & Materials Section */}
          {paintSubtotal > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[#D4A574] mb-4 border-b border-[#D4A574] pb-2">
                Paint & Materials
              </h3>
              <div className="flex justify-between mb-2">
                <span>Paint ({paintCosts.gallons} gallons @ ${paintCosts.pricePerGallon}/gal, {paintCosts.coats} coats)</span>
                <span>${paintSubtotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Additional Labor Section */}
          {additionalLaborSubtotal > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[#4ECDC4] mb-4 border-b border-[#4ECDC4] pb-2">
                Additional Labor
              </h3>
              {additionalLabor.filter((member: any) => member.name && parseFloat(member.hours) > 0).map((member: any, index: number) => (
                <div key={index} className="flex justify-between mb-2">
                  <span>{member.name} ({member.hours} hrs @ ${member.rate}/hr)</span>
                  <span>${((parseFloat(member.hours) || 0) * (parseFloat(member.rate) || 0)).toFixed(2)}</span>
                </div>
              ))}
              <div className="text-right font-semibold text-[#4ECDC4] mt-2">
                Additional Labor Total: ${additionalLaborSubtotal.toFixed(2)}
              </div>
            </div>
          )}

          {/* Additional Services Section */}
          {additionalServicesSubtotal > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[#DCDCAA] mb-4 border-b border-[#DCDCAA] pb-2">
                Additional Services
              </h3>
              {additionalServices.filter((service: any) => parseFloat(service.hours) > 0).map((service: any, index: number) => (
                <div key={index} className="flex justify-between mb-2">
                  <span>{service.name} ({service.hours} hrs @ ${service.rate}/hr)</span>
                  <span>${((parseFloat(service.hours) || 0) * (parseFloat(service.rate.toString()) || 0)).toFixed(2)}</span>
                </div>
              ))}
              <div className="text-right font-semibold text-[#6A9955] mt-2">
                Additional Services: ${additionalServicesSubtotal.toFixed(2)}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="border-t border-gray-600 pt-4">
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Tax ({(taxConfig.gst + taxConfig.pst + taxConfig.hst + taxConfig.salesTax + taxConfig.vat + taxConfig.otherTax).toFixed(1)}%):</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-[#6A9955] bg-gray-900 p-3 rounded">
              <span>Grand Total:</span>
              <span>${grandTotal.toFixed(2)}</span>
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