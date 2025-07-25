import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Download, Mail, Plus, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { apiRequest } from '@/lib/queryClient';
import type { Project } from '@shared/schema';

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
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const savedData = loadSavedData();

  const [projectTitle, setProjectTitle] = useState(savedData.projectTitle || '');
  const [estimateDate, setEstimateDate] = useState(savedData.estimateDate || new Date().toISOString().split('T')[0]);

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

  // Additional services
  const [additionalServices, setAdditionalServices] = useState(savedData.additionalServices || [
    { name: 'Wood Reconditioning', hours: '', rate: 60 }
  ]);

  // Toggle state for action buttons
  const [actionMode, setActionMode] = useState<'download' | 'email'>('email');

  // Save form data to localStorage whenever state changes
  useEffect(() => {
    const formData = {
      projectTitle,
      estimateDate,
      workStages,
      paintCosts,
      additionalServices
    };
    localStorage.setItem('estimateFormData', JSON.stringify(formData));
  }, [projectTitle, estimateDate, workStages, paintCosts, additionalServices]);

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

  const paintSubtotal = (parseFloat(paintCosts.pricePerGallon) || 0) * 
                       (parseFloat(paintCosts.gallons) || 0) * 
                       (parseFloat(paintCosts.coats) || 1);

  const subtotal = laborSubtotal + additionalServicesSubtotal + paintSubtotal;
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
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <Input
                    type="date"
                    value={estimateDate}
                    onChange={(e) => setEstimateDate(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
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
                      value={stage.hours}
                      onChange={(e) => updateWorkStage(index, 'hours', e.target.value)}
                      placeholder="0"
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
                    value={paintCosts.pricePerGallon}
                    onChange={(e) => setPaintCosts((prev: any) => ({ ...prev, pricePerGallon: e.target.value }))}
                    placeholder="0.00"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Gallons</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.25"
                    value={paintCosts.gallons}
                    onChange={(e) => setPaintCosts((prev: any) => ({ ...prev, gallons: e.target.value }))}
                    placeholder="0"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Coats</label>
                  <Select 
                    value={paintCosts.coats} 
                    onValueChange={(value) => setPaintCosts((prev: any) => ({ ...prev, coats: value }))}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
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

          {/* Additional Services */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-[#DCDCAA]">Additional Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {additionalServices.map((service: any, index: number) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-800 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-2">{service.name}</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Hours</label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={service.hours}
                      onChange={(e) => updateAdditionalService(index, 'hours', e.target.value)}
                      placeholder="0"
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
                  <div className="md:col-span-3 text-right text-[#6A9955] font-semibold">
                    Total: ${((parseFloat(service.hours) || 0) * (parseFloat(service.rate.toString()) || 0)).toFixed(2)}
                  </div>
                </div>
              ))}
              <div className="text-right text-lg font-semibold text-[#6A9955]">
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