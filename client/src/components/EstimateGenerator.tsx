import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Download, Mail, Plus, Trash2, ChevronDown, ChevronUp, User, MapPin, Phone, Calendar } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import type { Project } from '@shared/schema';

interface EstimateGeneratorProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export default function EstimateGenerator({ project, isOpen, onClose }: EstimateGeneratorProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    estimateInfo: true,
    servicesLabor: true,
    materials: true,
    additionalCosts: false,
    notes: false
  });

  // Estimate data state
  const [estimateData, setEstimateData] = useState({
    estimateNumber: `EST-${Date.now().toString().slice(-6)}`,
    projectTitle: project?.notes || project?.projectType || '',
    clientName: project?.clientName || '',
    clientEmail: project?.clientEmail || '',
    clientPhone: project?.clientPhone || '',
    address: project?.address || '',
    estimateDate: format(new Date(), 'yyyy-MM-dd'),
    validUntil: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd') // 30 days from now
  });

  // Services & Labor state
  const [servicesLabor, setServicesLabor] = useState([
    { description: 'Painting Services', hours: '', rate: '60', total: 0 }
  ]);

  // Paint & Materials state
  const [materials, setMaterials] = useState([
    { description: 'Paint & Materials', quantity: '', unit: 'gallons', unitPrice: '', total: 0 }
  ]);

  // Additional costs state
  const [additionalCosts, setAdditionalCosts] = useState([
    { description: 'Travel/Transportation', amount: '', total: 0 }
  ]);

  // Project notes
  const [projectNotes, setProjectNotes] = useState('');

  // Email state
  const [emailMessage, setEmailMessage] = useState('');
  const [actionMode, setActionMode] = useState<'download' | 'email'>('email');

  // Get documents logo
  const { data: documentsLogo } = useQuery({
    queryKey: [`/api/users/1/logos/documents`],
    select: (data: any) => data?.logo || null
  });

  const { data: fallbackLogo } = useQuery({
    queryKey: [`/api/users/1/logo`],
    select: (data: any) => data?.logo || null,
    enabled: !documentsLogo
  });

  const currentLogo = documentsLogo || fallbackLogo;

  // Toggle section function
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Calculate totals
  const laborTotal = servicesLabor.reduce((sum, item) => {
    const hours = parseFloat(item.hours) || 0;
    const rate = parseFloat(item.rate) || 0;
    return sum + (hours * rate);
  }, 0);

  const materialsTotal = materials.reduce((sum, item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    return sum + (quantity * unitPrice);
  }, 0);

  const additionalTotal = additionalCosts.reduce((sum, item) => {
    return sum + (parseFloat(item.amount) || 0);
  }, 0);

  const subtotal = laborTotal + materialsTotal + additionalTotal;
  const tax = subtotal * 0.12; // 12% tax
  const total = subtotal + tax;

  // Helper functions for services & labor
  const updateServiceLabor = (index: number, field: string, value: string) => {
    setServicesLabor(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addServiceLabor = () => {
    setServicesLabor(prev => [...prev, { description: '', hours: '', rate: '60', total: 0 }]);
  };

  const removeServiceLabor = (index: number) => {
    if (servicesLabor.length > 1) {
      setServicesLabor(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Helper functions for materials
  const updateMaterial = (index: number, field: string, value: string) => {
    setMaterials(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addMaterial = () => {
    setMaterials(prev => [...prev, { description: '', quantity: '', unit: 'gallons', unitPrice: '', total: 0 }]);
  };

  const removeMaterial = (index: number) => {
    if (materials.length > 1) {
      setMaterials(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Helper functions for additional costs
  const updateAdditionalCost = (index: number, field: string, value: string) => {
    setAdditionalCosts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addAdditionalCost = () => {
    setAdditionalCosts(prev => [...prev, { description: '', amount: '', total: 0 }]);
  };

  const removeAdditionalCost = (index: number) => {
    if (additionalCosts.length > 1) {
      setAdditionalCosts(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Initialize email message
  React.useEffect(() => {
    const firstName = estimateData.clientName.split(' ')[0] || 'Client';
    const defaultMessage = `Hi ${firstName},

Please find attached your estimate for painting services.

This estimate is valid until ${format(new Date(estimateData.validUntil), 'MMMM d, yyyy')}.

If you have any questions, please don't hesitate to contact me.

Best regards,
A-Frame Painting
cortespainter@gmail.com`;
    
    setEmailMessage(defaultMessage);
  }, [estimateData.clientName, estimateData.validUntil]);

  // Email mutation
  const emailMutation = useMutation({
    mutationFn: async (pdfData: string) => {
      const pdfBase64 = pdfData.includes(',') ? pdfData.split(',')[1] : pdfData;
      
      const response = await apiRequest('/api/send-estimate-email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: estimateData.clientEmail,
          clientName: estimateData.clientName || 'Client',
          estimateNumber: estimateData.estimateNumber,
          projectTitle: estimateData.projectTitle,
          totalAmount: total.toFixed(2),
          customMessage: emailMessage,
          pdfData: pdfBase64
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send estimate email');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Estimate Sent!",
        description: `Estimate sent to ${estimateData.clientEmail}`,
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send estimate",
        variant: "destructive",
      });
    },
  });

  const generatePDF = async (sendEmail = false) => {
    if (!printRef.current) return;

    try {
      const canvas = await html2canvas(printRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

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

      if (sendEmail) {
        const pdfData = pdf.output('datauristring');
        emailMutation.mutate(pdfData);
      } else {
        pdf.save(`estimate-${estimateData.estimateNumber}.pdf`);
        toast({
          title: "PDF Generated!",
          description: "Estimate downloaded successfully",
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] bg-gray-900 border-gray-700 text-white overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-[#8B5FBF]">
            Generate Estimate
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-6">
          
          {/* Estimate Information Section */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-750 transition-colors"
              onClick={() => toggleSection('estimateInfo')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#569CD6] flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Estimate Information
                </CardTitle>
                {expandedSections.estimateInfo ? 
                  <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                }
              </div>
            </CardHeader>
            {expandedSections.estimateInfo && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Estimate Number</label>
                    <Input
                      value={estimateData.estimateNumber}
                      onChange={(e) => setEstimateData(prev => ({ ...prev, estimateNumber: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Estimate Date</label>
                    <Input
                      type="date"
                      value={estimateData.estimateDate}
                      onChange={(e) => setEstimateData(prev => ({ ...prev, estimateDate: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Valid Until</label>
                    <Input
                      type="date"
                      value={estimateData.validUntil}
                      onChange={(e) => setEstimateData(prev => ({ ...prev, validUntil: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Project Title</label>
                    <Input
                      value={estimateData.projectTitle}
                      onChange={(e) => setEstimateData(prev => ({ ...prev, projectTitle: e.target.value }))}
                      placeholder="Enter project description"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Client Name</label>
                    <Input
                      value={estimateData.clientName}
                      onChange={(e) => setEstimateData(prev => ({ ...prev, clientName: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input
                      type="email"
                      value={estimateData.clientEmail}
                      onChange={(e) => setEstimateData(prev => ({ ...prev, clientEmail: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <Input
                      value={estimateData.clientPhone}
                      onChange={(e) => setEstimateData(prev => ({ ...prev, clientPhone: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <Input
                    value={estimateData.address}
                    onChange={(e) => setEstimateData(prev => ({ ...prev, address: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
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
                <CardTitle className="text-[#EA580C] flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Services & Labor
                </CardTitle>
                {expandedSections.servicesLabor ? 
                  <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                }
              </div>
            </CardHeader>
            {expandedSections.servicesLabor && (
              <CardContent className="space-y-4">
                {servicesLabor.map((service, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-750 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium mb-2">Service Description</label>
                      <Input
                        value={service.description}
                        onChange={(e) => updateServiceLabor(index, 'description', e.target.value)}
                        placeholder="e.g., Interior Painting"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Hours</label>
                      <Input
                        type="number"
                        value={service.hours}
                        onChange={(e) => updateServiceLabor(index, 'hours', e.target.value)}
                        placeholder="0"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Rate/Hour</label>
                      <Input
                        type="number"
                        value={service.rate}
                        onChange={(e) => updateServiceLabor(index, 'rate', e.target.value)}
                        placeholder="60"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <label className="block text-sm font-medium mb-2">Total</label>
                        <div className="text-[#6A9955] font-semibold text-lg">
                          ${((parseFloat(service.hours) || 0) * (parseFloat(service.rate) || 0)).toFixed(2)}
                        </div>
                      </div>
                      <Button
                        onClick={() => removeServiceLabor(index)}
                        variant="outline"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 border-red-500 text-white mb-1"
                        disabled={servicesLabor.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  onClick={addServiceLabor}
                  className="bg-[#EA580C] hover:bg-[#EA580C]/80 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
                <div className="text-right">
                  <div className="text-lg font-semibold text-[#EA580C]">
                    Labor Total: ${laborTotal.toFixed(2)}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Paint & Materials Section */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-750 transition-colors"
              onClick={() => toggleSection('materials')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#D4AC0D] flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Paint & Materials
                </CardTitle>
                {expandedSections.materials ? 
                  <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                }
              </div>
            </CardHeader>
            {expandedSections.materials && (
              <CardContent className="space-y-4">
                {materials.map((material, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-750 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium mb-2">Material Description</label>
                      <Input
                        value={material.description}
                        onChange={(e) => updateMaterial(index, 'description', e.target.value)}
                        placeholder="e.g., Premium Paint"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Quantity</label>
                      <Input
                        type="number"
                        value={material.quantity}
                        onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
                        placeholder="0"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Unit</label>
                      <Input
                        value={material.unit}
                        onChange={(e) => updateMaterial(index, 'unit', e.target.value)}
                        placeholder="gallons"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Unit Price</label>
                      <Input
                        type="number"
                        value={material.unitPrice}
                        onChange={(e) => updateMaterial(index, 'unitPrice', e.target.value)}
                        placeholder="0"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <label className="block text-sm font-medium mb-2">Total</label>
                        <div className="text-[#6A9955] font-semibold text-lg">
                          ${((parseFloat(material.quantity) || 0) * (parseFloat(material.unitPrice) || 0)).toFixed(2)}
                        </div>
                      </div>
                      <Button
                        onClick={() => removeMaterial(index)}
                        variant="outline"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 border-red-500 text-white mb-1"
                        disabled={materials.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  onClick={addMaterial}
                  className="bg-[#D4AC0D] hover:bg-[#D4AC0D]/80 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Material
                </Button>
                <div className="text-right">
                  <div className="text-lg font-semibold text-[#D4AC0D]">
                    Materials Total: ${materialsTotal.toFixed(2)}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Additional Costs Section */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-750 transition-colors"
              onClick={() => toggleSection('additionalCosts')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#6A9955] flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Additional Costs
                </CardTitle>
                {expandedSections.additionalCosts ? 
                  <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                }
              </div>
            </CardHeader>
            {expandedSections.additionalCosts && (
              <CardContent className="space-y-4">
                {additionalCosts.map((cost, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-750 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Input
                        value={cost.description}
                        onChange={(e) => updateAdditionalCost(index, 'description', e.target.value)}
                        placeholder="e.g., Travel/Transportation"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Amount</label>
                      <Input
                        type="number"
                        value={cost.amount}
                        onChange={(e) => updateAdditionalCost(index, 'amount', e.target.value)}
                        placeholder="0"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <label className="block text-sm font-medium mb-2">Total</label>
                        <div className="text-[#6A9955] font-semibold text-lg">
                          ${(parseFloat(cost.amount) || 0).toFixed(2)}
                        </div>
                      </div>
                      <Button
                        onClick={() => removeAdditionalCost(index)}
                        variant="outline"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 border-red-500 text-white mb-1"
                        disabled={additionalCosts.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  onClick={addAdditionalCost}
                  className="bg-[#6A9955] hover:bg-[#6A9955]/80 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Cost
                </Button>
                <div className="text-right">
                  <div className="text-lg font-semibold text-[#6A9955]">
                    Additional Total: ${additionalTotal.toFixed(2)}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Project Notes Section */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-750 transition-colors"
              onClick={() => toggleSection('notes')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#3182CE] flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Project Notes
                </CardTitle>
                {expandedSections.notes ? 
                  <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                }
              </div>
            </CardHeader>
            {expandedSections.notes && (
              <CardContent>
                <Textarea
                  value={projectNotes}
                  onChange={(e) => setProjectNotes(e.target.value)}
                  placeholder="Add any additional notes or special instructions for this project..."
                  className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                />
              </CardContent>
            )}
          </Card>

          {/* Summary Section */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-[#8B5FBF]">Estimate Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-[#EA580C]">
                <span>Services & Labor:</span>
                <span>${laborTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#D4AC0D]">
                <span>Paint & Materials:</span>
                <span>${materialsTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#6A9955]">
                <span>Additional Costs:</span>
                <span>${additionalTotal.toFixed(2)}</span>
              </div>
              <hr className="border-gray-600" />
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (12%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <hr className="border-gray-600" />
              <div className="flex justify-between text-2xl font-bold text-[#8B5FBF]">
                <span>Total Estimate:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Email Message Section */}
          {actionMode === 'email' && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-[#569CD6]">Email Message</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Enter custom email message..."
                  className="bg-gray-700 border-gray-600 text-white min-h-[120px]"
                />
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button 
              onClick={onClose}
              variant="outline" 
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => setActionMode(actionMode === 'download' ? 'email' : 'download')}
                variant="outline"
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                {actionMode === 'download' ? 'Switch to Email' : 'Switch to Download'}
              </Button>
              <Button 
                onClick={() => generatePDF(false)}
                className="bg-[#8B5FBF] hover:bg-[#8B5FBF]/80"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button 
                onClick={() => generatePDF(true)}
                className="bg-[#EA580C] hover:bg-[#EA580C]/80"
                disabled={emailMutation.isPending}
              >
                {emailMutation.isPending ? (
                  'Sending...'
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Hidden PDF Template */}
        <div 
          ref={printRef} 
          className="fixed -left-[9999px] w-[210mm] bg-white p-8 text-black"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          <div className="text-center mb-8">
            <img 
              src="/aframe-logo.png" 
              alt="A-Frame Logo" 
              className="mx-auto mb-4 h-12"
            />
            <h1 className="text-3xl font-bold">ESTIMATE</h1>
          </div>

          <div className="flex justify-between mb-6">
            <div>
              <p><strong>Estimate #:</strong> {estimateData.estimateNumber}</p>
              <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">From:</h3>
              <p>A-Frame Painting</p>
              <p>Professional Painting Services</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">To:</h3>
              <p>{estimateData.clientName}</p>
              <p>{estimateData.clientEmail}</p>
              <p>{estimateData.address}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Project: {estimateData.projectTitle}</h3>
          </div>

          <table className="w-full mb-6 border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Description</th>
                <th className="border border-gray-300 p-2 text-right">Hours</th>
                <th className="border border-gray-300 p-2 text-right">Rate</th>
                <th className="border border-gray-300 p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {servicesLabor.map((service, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2">{service.description}</td>
                  <td className="border border-gray-300 p-2 text-right">{service.hours}</td>
                  <td className="border border-gray-300 p-2 text-right">${service.rate}</td>
                  <td className="border border-gray-300 p-2 text-right">${((parseFloat(service.hours) || 0) * (parseFloat(service.rate) || 0)).toFixed(2)}</td>
                </tr>
              ))}
              {materials.map((material, index) => (
                <tr key={`material-${index}`}>
                  <td className="border border-gray-300 p-2">{material.description}</td>
                  <td className="border border-gray-300 p-2 text-right">{material.quantity} {material.unit}</td>
                  <td className="border border-gray-300 p-2 text-right">${material.unitPrice}</td>
                  <td className="border border-gray-300 p-2 text-right">${((parseFloat(material.quantity) || 0) * (parseFloat(material.unitPrice) || 0)).toFixed(2)}</td>
                </tr>
              ))}
              {additionalCosts.map((cost, index) => (
                <tr key={`cost-${index}`}>
                  <td className="border border-gray-300 p-2">{cost.description}</td>
                  <td className="border border-gray-300 p-2 text-right">-</td>
                  <td className="border border-gray-300 p-2 text-right">-</td>
                  <td className="border border-gray-300 p-2 text-right">${(parseFloat(cost.amount) || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-right">
            <div className="mb-2">
              <span className="mr-4">Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="mb-2">
              <span className="mr-4">Tax (12%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="text-xl font-bold">
              <span className="mr-4">Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center mt-8 text-gray-600">
            <p>Thank you for considering A-Frame Painting!</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}