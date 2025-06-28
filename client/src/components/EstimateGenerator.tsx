import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Download, Send, Calculator } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

  const [estimateData, setEstimateData] = useState<EstimateData>({
    // Client Information from project
    clientName: project.clientName || '',
    clientAddress: project.address || '',
    clientCity: project.clientCity || '',
    clientPostal: project.clientPostal || '',
    clientEmail: project.clientEmail || '',
    clientPhone: project.clientPhone || '',

    // Estimate Details
    estimateNumber: 'EST #',
    date: new Date().toISOString().split('T')[0],
    projectTitle: `${project.projectType} - ${project.clientName}`,
    projectDescription: project.notes || '',

    // Default Work Stages - reset to zero
    workStages: [
      {
        name: 'Surface Preparation',
        description: 'Cleaning, scraping, sanding surfaces',
        hours: 0,
        rate: 60,
        total: 0,
      },
      {
        name: 'Priming',
        description: 'Apply primer coat to prepared surfaces',
        hours: 0,
        rate: 60,
        total: 0,
      },
      {
        name: 'Painting',
        description: 'Apply finish coats',
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
        rate: 100,
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
  });

  // Calculate functions
  const calculateSubtotal = () => {
    const laborTotal = estimateData.workStages.reduce((sum, stage) => sum + stage.total, 0) +
                      estimateData.additionalServices.filter(s => s.included).reduce((sum, service) => sum + service.total, 0);
    
    if (estimateData.paintSuppliedBy === 'contractor') {
      return laborTotal + estimateData.paintCost + estimateData.deliveryCost;
    }
    return laborTotal;
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

  // Generate PDF
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
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Hide the element again
      element.style.visibility = 'hidden';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `estimate-${estimateData.estimateNumber.replace(/[^a-zA-Z0-9]/g, '')}-${estimateData.clientName.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
      pdf.save(filename);
      
      toast({
        title: "PDF Generated",
        description: "Estimate PDF has been downloaded",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  // Send estimate email (placeholder)
  const generateClientEmail = () => {
    const subject = `Painting Estimate ${estimateData.estimateNumber} - ${estimateData.projectTitle}`;
    const body = `Dear ${estimateData.clientName},

Please find attached your painting estimate for ${estimateData.projectTitle}.

Total Estimate: $${calculateTotal().toFixed(2)}

This estimate is valid for 30 days. Please let me know if you have any questions.

Best regards,
A-Frame Painting`;

    const emailUrl = `mailto:${estimateData.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(emailUrl);
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
                    <label className="text-sm font-medium mb-1 block">Estimate #</label>
                    <Input
                      value={estimateData.estimateNumber}
                      onChange={(e) => setEstimateData({...estimateData, estimateNumber: e.target.value})}
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
                <div>
                  <label className="text-sm font-medium mb-1 block">Project Title</label>
                  <Input
                    value={estimateData.projectTitle}
                    onChange={(e) => setEstimateData({...estimateData, projectTitle: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Project Description</label>
                  <Textarea
                    value={estimateData.projectDescription}
                    onChange={(e) => setEstimateData({...estimateData, projectDescription: e.target.value})}
                    rows={3}
                    placeholder="Detailed description of the painting project..."
                  />
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
                          value={stage.hours}
                          onChange={(e) => updateWorkStage(index, 'hours', parseFloat(e.target.value) || 0)}
                          step="0.5"
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

            {/* Additional Services */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {estimateData.additionalServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={service.included}
                        onChange={() => toggleAdditionalService(index)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {service.hours}h × ${service.rate}/h
                        </div>
                      </div>
                    </div>
                    <div className="font-medium">${service.total.toFixed(2)}</div>
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
                      value={estimateData.primerCoats}
                      onChange={(e) => setEstimateData({...estimateData, primerCoats: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Top Coats</label>
                    <Input
                      type="number"
                      value={estimateData.topCoats}
                      onChange={(e) => setEstimateData({...estimateData, topCoats: parseInt(e.target.value) || 2})}
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
                      <SelectItem value="contractor">A-Frame Painting</SelectItem>
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
                        value={estimateData.paintCost}
                        onChange={(e) => setEstimateData({...estimateData, paintCost: parseFloat(e.target.value) || 0})}
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Delivery Cost</label>
                      <Input
                        type="number"
                        value={estimateData.deliveryCost}
                        onChange={(e) => setEstimateData({...estimateData, deliveryCost: parseFloat(e.target.value) || 0})}
                        step="0.01"
                      />
                    </div>
                  </div>
                )}
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
                      <span>Labor Subtotal:</span>
                      <span className="font-medium">
                        ${(estimateData.workStages.reduce((sum, stage) => sum + stage.total, 0) + 
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
                  onClick={generateClientEmail}
                  disabled={!estimateData.clientEmail}
                  className="flex items-center bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Estimate
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden Print Version */}
        <div
          ref={printRef}
          className="absolute left-[-9999px] bg-white p-8"
          style={{ ...fontStyles, minHeight: '297mm', width: '210mm', visibility: 'hidden' }}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center mb-4">
                <img src="/aframe-logo.png" alt="A-Frame Painting" className="h-16" />
              </div>
              <p className="text-lg text-gray-600 font-medium">ESTIMATE</p>
              <div className="mt-4 text-sm text-gray-600">
                <p>A-Frame Painting</p>
                <p>884 Hayes Rd</p>
                <p>Manson's Landing, BC V0P1K0</p>
                <p>cortespainter@gmail.com</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm">
                <p><strong>Estimate #:</strong> {estimateData.estimateNumber}</p>
                <p><strong>Date:</strong> {estimateData.date}</p>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-800 mb-2">Estimate For:</h3>
            <div className="text-gray-700">
              <p>{estimateData.clientName}</p>
              <p>{estimateData.clientAddress}</p>
              <p>{estimateData.clientCity} {estimateData.clientPostal}</p>
              <p>{estimateData.clientEmail}</p>
              <p>{estimateData.clientPhone}</p>
            </div>
          </div>

          {/* Project Title */}
          {estimateData.projectTitle && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800">{estimateData.projectTitle}</h2>
            </div>
          )}

          {/* Project Description */}
          {estimateData.projectDescription && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Project Description:</h3>
              <p className="text-gray-700 whitespace-pre-line">{estimateData.projectDescription}</p>
            </div>
          )}

          {/* Work Stages */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Work Breakdown:</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-3 text-left">Stage</th>
                  <th className="border border-gray-300 p-3 text-left">Description</th>
                  <th className="border border-gray-300 p-3 text-center">Hours</th>
                  <th className="border border-gray-300 p-3 text-center">Rate</th>
                  <th className="border border-gray-300 p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {estimateData.workStages.map((stage, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-3 font-medium">{stage.name}</td>
                    <td className="border border-gray-300 p-3">{stage.description}</td>
                    <td className="border border-gray-300 p-3 text-center">{stage.hours}</td>
                    <td className="border border-gray-300 p-3 text-center">${stage.rate}</td>
                    <td className="border border-gray-300 p-3 text-right">${stage.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Additional Services */}
          {estimateData.additionalServices.some(service => service.included) && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Additional Services:</h3>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left">Service</th>
                    <th className="border border-gray-300 p-3 text-center">Hours</th>
                    <th className="border border-gray-300 p-3 text-center">Rate</th>
                    <th className="border border-gray-300 p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {estimateData.additionalServices.filter(service => service.included).map((service, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-3 font-medium">{service.name}</td>
                      <td className="border border-gray-300 p-3 text-center">{service.hours}</td>
                      <td className="border border-gray-300 p-3 text-center">${service.rate}</td>
                      <td className="border border-gray-300 p-3 text-right">${service.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paint Details */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">Paint & Materials:</h3>
            <div className="text-gray-700 space-y-1">
              <p><strong>Primer Coats:</strong> {estimateData.primerCoats}</p>
              <p><strong>Top Coats:</strong> {estimateData.topCoats}</p>
              <p><strong>Paint and Supplies:</strong> {estimateData.paintSuppliedBy === 'contractor' ? 'A-Frame Painting' : 'Client'}</p>
              {estimateData.paintSuppliedBy === 'contractor' && (
                <>
                  <p><strong>Paint Cost:</strong> ${estimateData.paintCost.toFixed(2)}</p>
                  <p><strong>Delivery Cost:</strong> ${estimateData.deliveryCost.toFixed(2)}</p>
                </>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64">
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">GST (5%)</span>
                  <span className="font-semibold">${calculateGST().toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold bg-gray-100 px-3 rounded">
                  <span>Total Estimate</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm text-gray-600">
                  <span>Maximum (w/ 20% buffer)</span>
                  <span>${(calculateTotal() * 1.2).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-800 mb-3">Terms & Conditions:</h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>IMPORTANT:</strong> This is an ESTIMATE, not a quote. While I do my best to stay within the proposed time limits, painting projects can sometimes reveal unexpected conditions.</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Estimates include a 20% tolerance for unforeseen circumstances</li>
                <li>I will contact you when we reach the original estimate to discuss options</li>
                <li>Extra work (wood rot, extensive repairs) will be charged hourly as outlined</li>
                <li>Power washing rate: $100/hour when required</li>
                <li>Paint costs {estimateData.paintSuppliedBy === 'client' ? 'are the responsibility of the client' : 'include delivery to remote location'}</li>
                <li>Weather conditions may affect project timeline</li>
                <li>Final costs may vary up to 20% from this estimate</li>
              </ul>
              <div className="mt-4 pt-4 border-t">
                <p className="text-center">
                  <strong>Thank you for considering A-Frame Painting for your project!</strong>
                </p>
                <p className="text-center mt-2">
                  A-Frame Painting • cortespainter@gmail.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}