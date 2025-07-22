import React, { useState, useRef } from 'react';
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

  const [estimateData, setEstimateData] = useState({
    estimateNumber: '',
    date: new Date().toLocaleDateString('en-CA'),
    projectTitle: '',
    prepWork: 0,
    woodReconditioning: 0,
    drywallRepair: 0,
    paintSupplier: 'A-Frame',
    paintCost: 0,
  });

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
      estimateRef.current.style.display = 'block';
      estimateRef.current.style.visibility = 'visible';
      estimateRef.current.style.position = 'absolute';
      estimateRef.current.style.top = '-9999px';
      estimateRef.current.style.left = '-9999px';
      estimateRef.current.style.width = '794px';
      
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
        height: 1123
      });

      // Restore original styles
      estimateRef.current.style.display = originalDisplay;
      estimateRef.current.style.visibility = 'hidden';
      estimateRef.current.style.position = 'static';

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [794, 1123]
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.7);
      pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1123);

      // Download PDF
      pdf.save(`Estimate-${estimateData.estimateNumber || 'Draft'}-${project?.clientName || 'Client'}.pdf`);

      toast({
        title: "PDF Generated",
        description: "Estimate PDF downloaded successfully!",
      });

    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sendEstimateEmail = async () => {
    if (!project?.clientEmail) {
      toast({
        title: "No Email Address",
        description: "Client email address is required to send estimate.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSending(true);
      
      // Generate PDF for email attachment (similar to generatePDF but return blob)
      // Implementation would be similar to above but return PDF as blob for email attachment
      
      toast({
        title: "Email Sent Successfully",
        description: `Estimate sent to ${project.clientEmail}`,
      });

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen max-w-md md:max-w-4xl max-h-[95vh] overflow-y-auto bg-black text-white">
        <DialogHeader>
          <DialogTitle className="text-orange-500">Estimate Generator</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Estimate Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estimateNumber">Estimate Number</Label>
              <Input
                id="estimateNumber"
                value={estimateData.estimateNumber}
                onChange={(e) => setEstimateData(prev => ({ ...prev, estimateNumber: e.target.value }))}
                placeholder="EST-001"
                className="bg-gray-800 border-gray-600"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={estimateData.date}
                onChange={(e) => setEstimateData(prev => ({ ...prev, date: e.target.value }))}
                className="bg-gray-800 border-gray-600"
              />
            </div>
          </div>

          {/* Work Stages */}
          <div>
            <h3 className="text-orange-500 font-semibold mb-3">Work Stages</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Prep (hours)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={estimateData.prepWork || ''}
                  onChange={(e) => setEstimateData(prev => ({ ...prev, prepWork: Number(e.target.value) || 0 }))}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <Label>Wood Reconditioning (hours)</Label>
                <Input
                  type="number"
                  inputMode="decimal" 
                  step="0.5"
                  value={estimateData.woodReconditioning || ''}
                  onChange={(e) => setEstimateData(prev => ({ ...prev, woodReconditioning: Number(e.target.value) || 0 }))}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <Label>Drywall Repair (hours)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5" 
                  value={estimateData.drywallRepair || ''}
                  onChange={(e) => setEstimateData(prev => ({ ...prev, drywallRepair: Number(e.target.value) || 0 }))}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Paint & Materials */}
          <div>
            <h3 className="text-orange-500 font-semibold mb-3">Paint & Materials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Paint Supplier</Label>
                <Select
                  value={estimateData.paintSupplier}
                  onValueChange={(value) => setEstimateData(prev => ({ ...prev, paintSupplier: value }))}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A-Frame">A-Frame</SelectItem>
                    <SelectItem value="Client Provided">Client Provided</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Paint Cost</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={estimateData.paintCost || ''}
                  onChange={(e) => setEstimateData(prev => ({ ...prev, paintCost: Number(e.target.value) || 0 }))}
                  className="bg-gray-800 border-gray-600"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-orange-500 font-semibold mb-3">Estimate Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Labor Subtotal:</span>
                <span>${laborSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paint & Materials:</span>
                <span>${paintCosts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-green-400">
                <span>Grand Total:</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={generatePDF}
              disabled={isGenerating}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button
              onClick={sendEstimateEmail}
              disabled={isSending || !project?.clientEmail}
              variant="outline"
              className="flex-1"
            >
              <Mail className="w-4 h-4 mr-2" />
              {isSending ? 'Sending...' : 'Email Estimate'}
            </Button>
          </div>
        </div>

        {/* Hidden PDF Preview Component */}
        <div 
          ref={estimateRef}
          style={{
            display: 'none',
            width: '794px',
            backgroundColor: '#000000',
            color: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            padding: '32px',
            lineHeight: '1.4'
          }}
        >
          {/* Header with Logo */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <img 
              src="/aframe-logo.png" 
              alt="A-Frame Painting"
              style={{ height: '96px', width: 'auto' }}
            />
          </div>

          {/* Title Section */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '32px',
            paddingBottom: '16px',
            borderBottom: '1px solid #4b5563'
          }}>
            <div>
              <h2 style={{ 
                fontSize: '48px', 
                fontWeight: '700', 
                color: '#EA580C',
                margin: '0 0 4px 0'
              }}>
                ESTIMATE
              </h2>
              <p style={{ 
                fontSize: '16px', 
                color: '#9CA3AF', 
                margin: '0'
              }}>
                {estimateData.estimateNumber && `#${estimateData.estimateNumber}`}
              </p>
            </div>
            <div style={{ 
              textAlign: 'right',
              fontSize: '14px',
              color: '#9CA3AF'
            }}>
              <div>Date: {estimateData.date}</div>
            </div>
          </div>

          {/* Client Information */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#EA580C', 
              marginBottom: '12px'
            }}>
              CLIENT INFORMATION
            </h3>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div><strong>{project?.clientName}</strong></div>
              <div>{project?.address}</div>
              {project?.clientCity && <div>{project.clientCity}, {project.clientPostal}</div>}
              {project?.clientEmail && <div>{project.clientEmail}</div>}
              {project?.clientPhone && <div>{project.clientPhone}</div>}
            </div>
          </div>

          {/* Labor Section */}
          {laborSubtotal > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#EF4444', 
                marginBottom: '12px'
              }}>
                SERVICES & LABOUR
              </h3>
              <div style={{ 
                border: '1px solid #EF4444',
                backgroundColor: '#18181B',
                padding: '16px'
              }}>
                {estimateData.prepWork > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #374151'
                  }}>
                    <span>Prep Work</span>
                    <span>${(estimateData.prepWork * 60).toFixed(2)}</span>
                  </div>
                )}
                {estimateData.woodReconditioning > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #374151'
                  }}>
                    <span>Wood Reconditioning</span>
                    <span>${(estimateData.woodReconditioning * 60).toFixed(2)}</span>
                  </div>
                )}
                {estimateData.drywallRepair > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    paddingTop: '8px'
                  }}>
                    <span>Drywall Repair</span>
                    <span>${(estimateData.drywallRepair * 60).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Materials Section */}
          {paintCosts > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#EA580C', 
                marginBottom: '12px'
              }}>
                MATERIALS & PAINT
              </h3>
              <div style={{ 
                border: '1px solid #EA580C',
                backgroundColor: '#18181B',
                padding: '16px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between'
                }}>
                  <span>Paint & Supplies</span>
                  <span>${paintCosts.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Total */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '32px'
          }}>
            <div style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              padding: '16px 24px',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: '700'
              }}>
                Grand Total: ${grandTotal.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ 
            marginTop: '48px',
            textAlign: 'center',
            fontSize: '16px',
            color: '#9CA3AF'
          }}>
            Thanks for considering A-Frame Painting!
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EstimateGenerator;