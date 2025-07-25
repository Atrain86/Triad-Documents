import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Download, Mail } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface EstimateGeneratorProps {
  project: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function EstimateGenerator({ project, isOpen, onClose }: EstimateGeneratorProps) {
  const { toast } = useToast();
  const estimateRef = useRef<HTMLDivElement>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Basic estimate data
  const [estimateNumber, setEstimateNumber] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [prepHours, setPrepHours] = useState('');
  const [primingHours, setPrimingHours] = useState('');
  const [paintingHours, setPaintingHours] = useState('');
  const [paintCost, setPaintCost] = useState('');

  // Calculate totals
  const laborSubtotal = (
    (parseFloat(prepHours) || 0) +
    (parseFloat(primingHours) || 0) +
    (parseFloat(paintingHours) || 0)
  ) * 60;
  
  const materialCosts = parseFloat(paintCost) || 0;
  const subtotal = laborSubtotal + materialCosts;
  const gst = subtotal * 0.05;
  const grandTotal = subtotal + gst;

  const generatePDF = async () => {
    if (!estimateRef.current) {
      toast({
        title: "Error",
        description: "Estimate preview not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(estimateRef.current, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000000',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.7);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Estimate-${estimateNumber || 'EST-001'}-${project?.clientName || 'Client'}.pdf`);
      
      toast({
        title: "PDF Generated",
        description: "Estimate PDF has been downloaded successfully.",
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
    if (!project?.clientEmail) {
      toast({
        title: "Error",
        description: "No email address found for this client.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // Generate PDF data
      const canvas = await html2canvas(estimateRef.current!, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000000',
      });

      const pdfData = canvas.toDataURL('image/jpeg', 0.7);
      const pdfBase64 = pdfData.includes(',') ? pdfData.split(',')[1] : pdfData;
      
      const response = await fetch('/api/send-estimate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: project.clientEmail,
          clientName: project.clientName || 'Client',
          estimateNumber: estimateNumber || 'EST-001',
          projectTitle: projectTitle || 'Painting Estimate',
          totalAmount: grandTotal.toFixed(2),
          customMessage: '',
          pdfData: pdfBase64
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send estimate email');
      }

      toast({
        title: "Estimate Sent!",
        description: `Estimate sent to ${project.clientEmail}`,
      });
    } catch (error) {
      console.error('Error sending estimate:', error);
      toast({
        title: "Error",
        description: "Failed to send estimate email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Estimate Generator</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Estimate Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Estimate Number</label>
                  <Input
                    value={estimateNumber}
                    onChange={(e) => setEstimateNumber(e.target.value)}
                    placeholder="EST-001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Project Title</label>
                  <Input
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Painting Project"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Labor Costs */}
          <Card>
            <CardHeader>
              <CardTitle>Labor Breakdown (@$60/hr)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Prep Work (hours)</label>
                  <Input
                    type="number"
                    value={prepHours}
                    onChange={(e) => setPrepHours(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Priming (hours)</label>
                  <Input
                    type="number"
                    value={primingHours}
                    onChange={(e) => setPrimingHours(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Painting (hours)</label>
                  <Input
                    type="number"
                    value={paintingHours}
                    onChange={(e) => setPaintingHours(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Material Costs */}
          <Card>
            <CardHeader>
              <CardTitle>Paint & Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="text-sm font-medium">Paint Cost</label>
                <Input
                  type="number"
                  value={paintCost}
                  onChange={(e) => setPaintCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Estimate Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Labor Subtotal:</span>
                  <span>${laborSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Materials:</span>
                  <span>${materialCosts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (5%):</span>
                  <span>${gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total:</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={generatePDF}
              disabled={isGenerating}
              className="flex-1"
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

        {/* Hidden PDF Preview */}
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
          {/* Header */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <img 
              src="/aframe-logo.png" 
              alt="A-Frame Painting"
              style={{ height: '96px', width: 'auto' }}
            />
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '16px' }}>
              ESTIMATE
            </h1>
          </div>

          {/* Client Info */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', color: '#EA580C', marginBottom: '8px' }}>
              Estimate For:
            </h2>
            <p style={{ fontSize: '16px', marginBottom: '4px' }}>
              {project?.clientName || 'Client Name'}
            </p>
            <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
              {project?.address || 'Address'}
            </p>
            <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
              {project?.clientEmail || 'Email'}
            </p>
          </div>

          {/* Labor Breakdown */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', color: '#EA580C', marginBottom: '16px' }}>
              Services & Labor
            </h2>
            <div style={{ backgroundColor: '#1a1a1a', padding: '16px', borderRadius: '8px' }}>
              {prepHours && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Prep Work - {prepHours}h × $60/hr</span>
                  <span>${(parseFloat(prepHours) * 60).toFixed(2)}</span>
                </div>
              )}
              {primingHours && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Priming - {primingHours}h × $60/hr</span>
                  <span>${(parseFloat(primingHours) * 60).toFixed(2)}</span>
                </div>
              )}
              {paintingHours && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Painting - {paintingHours}h × $60/hr</span>
                  <span>${(parseFloat(paintingHours) * 60).toFixed(2)}</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid #4B5563', paddingTop: '8px', marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>Labor Subtotal:</span>
                  <span>${laborSubtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Materials */}
          {materialCosts > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', color: '#EA580C', marginBottom: '16px' }}>
                Paint & Materials
              </h2>
              <div style={{ backgroundColor: '#1a1a1a', padding: '16px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Paint & Supplies</span>
                  <span>${materialCosts.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Total */}
          <div style={{ marginTop: '32px' }}>
            <div style={{ backgroundColor: '#1a1a1a', padding: '16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>GST (5%):</span>
                <span>${gst.toFixed(2)}</span>
              </div>
              <div style={{ 
                borderTop: '1px solid #4B5563', 
                paddingTop: '8px', 
                marginTop: '8px',
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#10B981'
              }}>
                <span>Grand Total:</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: '#9CA3AF' }}>
            <p>Thanks for considering A-Frame Painting!</p>
            <p style={{ marginTop: '8px' }}>cortespainter@gmail.com</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}