import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, Mail } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Project {
  id: number;
  clientName: string;
  address: string;
  clientCity?: string;
  clientPostal?: string;
  clientEmail?: string;
  clientPhone?: string;
  projectType: string;
  roomCount: number;
  difficulty: string;
  hourlyRate: number;
  status: string;
  notes?: string;
  createdAt: string;
}

interface EstimateGeneratorProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export default function EstimateGenerator({ project, isOpen, onClose }: EstimateGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const estimateRef = useRef<HTMLDivElement>(null);

  const [estimateNumber, setEstimateNumber] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [prepWork, setPrepWork] = useState(0);
  const [woodReconditioning, setWoodReconditioning] = useState(0);
  const [drywallRepair, setDrywallRepair] = useState(0);
  const [paintCost, setPaintCost] = useState(0);

  const calculateTotal = () => {
    const laborTotal = (prepWork + woodReconditioning + drywallRepair) * 60;
    return laborTotal + paintCost;
  };

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
      
      // Show the estimate preview element for capture
      const originalStyles = {
        position: estimateRef.current.style.position,
        opacity: estimateRef.current.style.opacity,
        pointerEvents: estimateRef.current.style.pointerEvents,
        top: estimateRef.current.style.top,
        left: estimateRef.current.style.left
      };

      estimateRef.current.style.position = 'fixed';
      estimateRef.current.style.opacity = '1';
      estimateRef.current.style.pointerEvents = 'auto';
      estimateRef.current.style.top = '0px';
      estimateRef.current.style.left = '0px';
      
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Capture as canvas and convert to PDF
      const canvas = await html2canvas(estimateRef.current, {
        backgroundColor: '#000000',
        scale: 1,
        useCORS: true,
        allowTaint: true
      });
      
      // Restore original styles
      Object.assign(estimateRef.current.style, originalStyles);
      
      // Convert to PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      pdf.addImage(imageData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      // Download PDF
      pdf.save(`Estimate-${estimateNumber || 'EST-001'}-${project.clientName.replace(/\s+/g, '-')}.pdf`);
      
      toast({
        title: "PDF Generated",
        description: "Estimate PDF has been downloaded successfully.",
      });
      
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      toast({
        title: "PDF Generation Failed",
        description: error.message || "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sendEstimateEmail = async () => {
    if (!estimateNumber || !project?.clientEmail) {
      toast({
        title: "Missing Information",
        description: "Please fill in estimate number and ensure client has an email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSending(true);
      
      // Generate PDF for email
      if (!estimateRef.current) {
        throw new Error('Estimate preview not ready');
      }

      // Show the estimate preview element for capture
      const originalStyles = {
        position: estimateRef.current.style.position,
        opacity: estimateRef.current.style.opacity,
        pointerEvents: estimateRef.current.style.pointerEvents,
        top: estimateRef.current.style.top,
        left: estimateRef.current.style.left
      };

      estimateRef.current.style.position = 'fixed';
      estimateRef.current.style.opacity = '1';
      estimateRef.current.style.pointerEvents = 'auto';
      estimateRef.current.style.top = '0px';
      estimateRef.current.style.left = '0px';
      
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Capture as canvas and convert to PDF
      const canvas = await html2canvas(estimateRef.current, {
        backgroundColor: '#000000',
        scale: 1,
        useCORS: true,
        allowTaint: true
      });
      
      // Restore original styles
      Object.assign(estimateRef.current.style, originalStyles);
      
      // Convert to PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      pdf.addImage(imageData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      // Convert PDF to base64
      const pdfData = pdf.output('datauristring');
      const pdfBase64 = pdfData.includes(',') ? pdfData.split(',')[1] : pdfData;
      
      // Send via server email
      const response = await fetch('/api/send-estimate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: project.clientEmail,
          clientName: project.clientName || 'Client',
          estimateNumber: estimateNumber || 'EST-001',
          projectTitle: projectTitle || 'Painting Estimate',
          totalAmount: calculateTotal().toFixed(2),
          customMessage: '',
          pdfData: pdfBase64
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send estimate email');
      }

      toast({
        title: "Estimate Sent!",
        description: `Estimate sent to ${project.clientEmail}`,
      });
      
    } catch (error: any) {
      console.error('Email Send Error:', error);
      toast({
        title: "Email Send Failed",
        description: error.message || "Failed to send estimate email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen max-w-md h-screen p-4 sm:max-w-3xl sm:h-auto overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-orange-500">Generate Estimate</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estimateNumber">Estimate Number</Label>
              <Input
                id="estimateNumber"
                value={estimateNumber}
                onChange={(e) => setEstimateNumber(e.target.value)}
                placeholder="EST-001"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label htmlFor="projectTitle">Project Title</Label>
              <Input
                id="projectTitle"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Painting Project"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          {/* Work Stages */}
          <div>
            <h3 className="text-lg font-semibold text-green-500 mb-3">Services & Labor</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="prepWork">Prep/Priming/Painting (hours)</Label>
                <Input
                  id="prepWork"
                  type="number"
                  inputMode="numeric"
                  value={prepWork || ''}
                  onChange={(e) => setPrepWork(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="woodReconditioning">Wood Reconditioning (hours)</Label>
                <Input
                  id="woodReconditioning"
                  type="number"
                  inputMode="numeric"
                  value={woodReconditioning || ''}
                  onChange={(e) => setWoodReconditioning(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="drywallRepair">Drywall Repair (hours)</Label>
                <Input
                  id="drywallRepair"
                  type="number"
                  inputMode="numeric"
                  value={drywallRepair || ''}
                  onChange={(e) => setDrywallRepair(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
          </div>

          {/* Paint Costs */}
          <div>
            <h3 className="text-lg font-semibold text-yellow-500 mb-3">Paint & Materials</h3>
            <div>
              <Label htmlFor="paintCost">Paint Cost ($)</Label>
              <Input
                id="paintCost"
                type="number"
                inputMode="decimal"
                value={paintCost || ''}
                onChange={(e) => setPaintCost(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          {/* Total */}
          <div className="bg-green-600 text-white p-4 rounded-md text-center">
            <div className="text-2xl font-bold">
              Total Estimate: ${calculateTotal().toFixed(2)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={generatePDF}
              disabled={isGenerating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download size={18} className="mr-2" />
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button
              onClick={sendEstimateEmail}
              disabled={isSending || !project?.clientEmail}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Mail size={18} className="mr-2" />
              {isSending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Estimate Preview (for PDF generation) */}
      <div 
        ref={estimateRef} 
        className="fixed -top-[9999px] -left-[9999px] w-[794px] opacity-0 pointer-events-none"
        style={{ backgroundColor: '#000000', color: '#fff', minHeight: '1200px' }}
      >
        <div className="p-8">
          {/* Header Section */}
          <div className="mb-8 text-center">
            <img 
              src="/aframe-logo.png" 
              alt="A-Frame Painting Logo" 
              className="h-24 w-auto mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-orange-500">ESTIMATE</h1>
          </div>
          
          {/* Client and Project Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-orange-500">Client Information</h3>
              <p className="font-semibold">{project.clientName}</p>
              <p>{project.address}</p>
              <p>{project.clientCity}, {project.clientPostal}</p>
              <p>{project.clientPhone}</p>
              <p>{project.clientEmail}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3 text-orange-500">Project Details</h3>
              <p><strong>Project:</strong> {projectTitle || 'Painting Project'}</p>
              <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
              <p><strong>Estimate #:</strong> {estimateNumber || 'EST-001'}</p>
            </div>
          </div>

          {/* Services & Labor Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3 text-green-500">Services & Labor</h2>
            <div className="border-2 border-green-500 bg-gray-900 p-4 rounded">
              {prepWork > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-700">
                  <span>Prep/Priming/Painting - {prepWork}h × $60/hr</span>
                  <span>${(prepWork * 60).toFixed(2)}</span>
                </div>
              )}
              {woodReconditioning > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-700">
                  <span>Wood Reconditioning - {woodReconditioning}h × $60/hr</span>
                  <span>${(woodReconditioning * 60).toFixed(2)}</span>
                </div>
              )}
              {drywallRepair > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-700 last:border-b-0">
                  <span>Drywall Repair - {drywallRepair}h × $60/hr</span>
                  <span>${(drywallRepair * 60).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-600 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Labor Total:</span>
                  <span>${((prepWork + woodReconditioning + drywallRepair) * 60).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Materials Section */}
          {paintCost > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-yellow-500">Paint & Materials</h2>
              <div className="border-2 border-yellow-500 bg-gray-900 p-4 rounded">
                <div className="flex justify-between">
                  <span>Paint & Materials</span>
                  <span>${paintCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Total Section */}
          <div className="mt-8 pt-4 border-t-2 border-green-500">
            <div className="bg-green-500 text-white p-4 rounded text-center">
              <div className="text-2xl font-bold">
                Total Estimate: ${calculateTotal().toFixed(2)}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-400">
            <p>A-Frame Painting • 884 Hayes Rd, Manson's Landing, BC V0P1K0</p>
            <p>cortespainter@gmail.com</p>
          </div>
        </div>
      </div>
    </Dialog>
  );
}