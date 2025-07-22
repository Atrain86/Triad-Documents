import React, { useState, useEffect, useRef } from 'react';
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen max-w-md md:max-w-3xl max-h-[95vh] overflow-y-auto bg-black text-white">
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

          <div>
            <Label htmlFor="projectTitle">Project Title</Label>
            <Input
              id="projectTitle"
              value={estimateData.projectTitle}
              onChange={(e) => setEstimateData(prev => ({ ...prev, projectTitle: e.target.value }))}
              placeholder="Painting Project"
              className="bg-gray-800 border-gray-600"
            />
          </div>

          {/* Work Stages */}
          <div>
            <h3 className="text-orange-500 font-semibold mb-3">Work Stages ($60/hour)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Prep/Priming/Painting (hours)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={estimateData.prepWork || ''}
                  onChange={(e) => setEstimateData(prev => ({
                    ...prev,
                    prepWork: Number(e.target.value) || 0
                  }))}
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
                  onChange={(e) => setEstimateData(prev => ({
                    ...prev,
                    woodReconditioning: Number(e.target.value) || 0
                  }))}
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
                  onChange={(e) => setEstimateData(prev => ({
                    ...prev,
                    drywallRepair: Number(e.target.value) || 0
                  }))}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Paint & Materials */}
          <div>
            <h3 className="text-yellow-500 font-semibold mb-3">Paint & Materials</h3>
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
                    <SelectItem value="Client">Client Supplied</SelectItem>
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
                  onChange={(e) => setEstimateData(prev => ({
                    ...prev,
                    paintCost: Number(e.target.value) || 0
                  }))}
                  className="bg-gray-800 border-gray-600"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-800 p-4 rounded">
            <div className="flex justify-between mb-2">
              <span>Labor Subtotal:</span>
              <span>${laborSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Paint & Materials:</span>
              <span>${paintCosts.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Grand Total:</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
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
                Estimate
              </h2>
              <p style={{ color: '#9ca3af', margin: '0' }}>Professional Painting Services</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '4px' }}>
                <span style={{ color: '#9ca3af' }}>Estimate #:</span>{' '}
                <span style={{ fontWeight: '600' }}>{estimateData.estimateNumber}</span>
              </p>
              <p style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '4px' }}>
                <span style={{ color: '#9ca3af' }}>Date:</span>{' '}
                <span style={{ fontWeight: '600' }}>{estimateData.date}</span>
              </p>
            </div>
          </div>

          {/* Client Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
            <div>
              <h3 style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '12px'
              }}>
                Estimate To
              </h3>
              <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                {project?.clientName || 'Client Name'}
              </p>
              <p style={{ color: '#d1d5db', fontSize: '16px', marginBottom: '4px' }}>
                {project?.address || 'Address'}
              </p>
              <p style={{ color: '#d1d5db', fontSize: '16px', marginBottom: '4px' }}>
                {project?.clientCity && project?.clientPostal ? `${project.clientCity}, ${project.clientPostal}` : 'City, Postal'}
              </p>
              {project?.clientPhone && (
                <p style={{ color: '#d1d5db', fontSize: '16px', marginBottom: '4px' }}>
                  {project.clientPhone}
                </p>
              )}
              {project?.clientEmail && (
                <p style={{ color: '#d1d5db', fontSize: '16px', marginBottom: '4px' }}>
                  {project.clientEmail}
                </p>
              )}
            </div>
            <div>
              <h3 style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '12px'
              }}>
                From
              </h3>
              <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                A-Frame Painting
              </p>
              <p style={{ color: '#d1d5db', fontSize: '16px', marginBottom: '4px' }}>
                884 Hayes Rd
              </p>
              <p style={{ color: '#d1d5db', fontSize: '16px', marginBottom: '4px' }}>
                Manson's Landing, BC V0P1K0
              </p>
              <p style={{ color: '#d1d5db', fontSize: '16px', marginBottom: '4px' }}>
                cortespainter@gmail.com
              </p>
            </div>
          </div>

          {/* Project Title */}
          {estimateData.projectTitle && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#EA580C',
                marginBottom: '16px'
              }}>
                {estimateData.projectTitle}
              </h3>
            </div>
          )}

          {/* Work Breakdown */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#6A9955',
              marginBottom: '16px',
              borderBottom: '2px solid #6A9955',
              paddingBottom: '8px'
            }}>
              Services & Labor
            </h3>
            <div style={{ 
              backgroundColor: '#1a1a1a',
              padding: '16px',
              borderRadius: '8px'
            }}>
              {estimateData.prepWork > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Prep/Priming/Painting ({estimateData.prepWork} hours)</span>
                  <span>${(estimateData.prepWork * 60).toFixed(2)}</span>
                </div>
              )}
              {estimateData.woodReconditioning > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Wood Reconditioning ({estimateData.woodReconditioning} hours)</span>
                  <span>${(estimateData.woodReconditioning * 60).toFixed(2)}</span>
                </div>
              )}
              {estimateData.drywallRepair > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Drywall Repair ({estimateData.drywallRepair} hours)</span>
                  <span>${(estimateData.drywallRepair * 60).toFixed(2)}</span>
                </div>
              )}
              <div style={{ 
                borderTop: '1px solid #4b5563', 
                marginTop: '16px', 
                paddingTop: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold'
              }}>
                <span>Labor Total:</span>
                <span style={{ color: '#6A9955' }}>${laborSubtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Materials */}
          {estimateData.paintCost > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#DCDCAA',
                marginBottom: '16px',
                borderBottom: '2px solid #DCDCAA',
                paddingBottom: '8px'
              }}>
                Paint & Materials
              </h3>
              <div style={{ 
                backgroundColor: '#1a1a1a',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Paint & Supplies</span>
                  <span style={{ color: '#DCDCAA', fontWeight: 'bold' }}>${estimateData.paintCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Total */}
          <div style={{ 
            textAlign: 'center', 
            backgroundColor: '#059669', 
            padding: '20px', 
            borderRadius: '8px',
            marginTop: '32px'
          }}>
            <div style={{ 
              color: '#ffffff', 
              fontSize: '24px', 
              fontWeight: 'bold' 
            }}>
              GRAND TOTAL: ${grandTotal.toFixed(2)}
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>
              Thanks for considering A-Frame Painting!
            </p>
            <p style={{ color: '#EA580C', fontSize: '12px', fontWeight: '600' }}>
              This estimate is valid for 30 days. Contact us for any questions.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EstimateGenerator;