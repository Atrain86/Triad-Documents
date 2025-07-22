import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface EstimateData {
  estimateNumber: string;
  date: string;
  projectTitle: string;
  clientName: string;
  workStages: {
    prep: number;
    priming: number;
    painting: number;
  };
  additionalServices: {
    woodReconditioning: number;
    drywallRepair: number;
  };
  paintSupplier: string;
  paintCosts: number;
}

interface EstimateGeneratorProps {
  projectId: number;
}

export default function EstimateGenerator({ projectId }: EstimateGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const estimateRef = useRef<HTMLDivElement>(null);

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const [estimateData, setEstimateData] = useState<EstimateData>({
    estimateNumber: '',
    date: new Date().toLocaleDateString('en-CA'),
    projectTitle: '',
    clientName: project?.clientName || '',
    workStages: {
      prep: 0,
      priming: 0,
      painting: 0,
    },
    additionalServices: {
      woodReconditioning: 0,
      drywallRepair: 0,
    },
    paintSupplier: 'A-Frame',
    paintCosts: 0,
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
    estimateData.workStages.prep +
    estimateData.workStages.priming +
    estimateData.workStages.painting +
    estimateData.additionalServices.woodReconditioning +
    estimateData.additionalServices.drywallRepair
  ) * 60;

  const paintCosts = estimateData.paintCosts;
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
      
      // Generate PDF data for email
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Estimate</title>
            <style>
              body {
                font-family: Inter, sans-serif;
                background-color: #000000;
                color: #ffffff;
                padding: 32px;
                line-height: 1.4;
                margin: 0;
                width: 794px;
              }
            </style>
          </head>
          <body>
            <!-- Header with Logo -->
            <div style="margin-bottom: 32px; text-align: center;">
              <img 
                src="/aframe-logo.png" 
                alt="A-Frame Painting"
                style="height: 96px; width: auto;"
              />
            </div>

            <!-- Title Section -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #EA580C;">
              <div>
                <h1 style="color: #EA580C; font-size: 36px; font-weight: bold; margin: 0;">ESTIMATE</h1>
                <p style="color: #d1d5db; font-size: 18px; margin: 8px 0 0 0;">${estimateData.date}</p>
              </div>
              <div style="text-align: right;">
                <p style="color: #EA580C; font-size: 24px; font-weight: bold; margin: 0;">EST ${estimateData.estimateNumber}</p>
              </div>
            </div>

            <!-- Client Information -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 32px;">
              <div style="flex: 1;">
                <h2 style="color: #EA580C; font-size: 20px; font-weight: bold; margin: 0 0 16px 0;">Client Information</h2>
                <div style="color: #ffffff; font-size: 16px; line-height: 1.6;">
                  <p style="margin: 0 0 8px 0; font-weight: bold;">${estimateData.clientName}</p>
                  <p style="margin: 0 0 8px 0;">${project?.address || ''}</p>
                  <p style="margin: 0 0 8px 0;">${project?.clientCity || ''} ${project?.clientPostal || ''}</p>
                  <p style="margin: 0 0 8px 0;">${project?.clientEmail || ''}</p>
                  <p style="margin: 0;">${project?.clientPhone || ''}</p>
                </div>
              </div>
              <div style="flex: 1; text-align: right;">
                <h2 style="color: #EA580C; font-size: 20px; font-weight: bold; margin: 0 0 16px 0;">From</h2>
                <div style="color: #ffffff; font-size: 16px; line-height: 1.6;">
                  <p style="margin: 0 0 8px 0; font-weight: bold;">A-Frame Painting</p>
                  <p style="margin: 0 0 8px 0;">884 Hayes Rd</p>
                  <p style="margin: 0 0 8px 0;">Manson's Landing, BC V0P1K0</p>
                  <p style="margin: 0 0 8px 0;">cortespainter@gmail.com</p>
                </div>
              </div>
            </div>

            <!-- Project Title -->
            <div style="margin-bottom: 24px;">
              <h2 style="color: #EA580C; font-size: 24px; font-weight: bold; margin: 0;">${estimateData.projectTitle || 'Painting Estimate'}</h2>
            </div>

            <!-- Services Section -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: #6A9955; font-size: 20px; font-weight: bold; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #6A9955;">Services & Labor</h3>
              <div style="background-color: #1a1a1a; padding: 16px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                  <span style="flex: 1; color: #ffffff;">Prep/Priming/Painting: ${estimateData.prepWork} hours</span>
                  <span style="color: #6A9955; font-weight: bold;">$${(estimateData.prepWork * 60).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                  <span style="flex: 1; color: #ffffff;">Wood Reconditioning: ${estimateData.woodReconditioning} hours</span>
                  <span style="color: #6A9955; font-weight: bold;">$${(estimateData.woodReconditioning * 60).toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                  <span style="flex: 1; color: #ffffff;">Drywall Repair: ${estimateData.drywallRepair} hours</span>
                  <span style="color: #6A9955; font-weight: bold;">$${(estimateData.drywallRepair * 60).toFixed(2)}</span>
                </div>
                <div style="border-top: 1px solid #4b5563; margin-top: 16px; padding-top: 16px;">
                  <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px;">
                    <span style="color: #ffffff;">Labor Total:</span>
                    <span style="color: #6A9955;">$${((estimateData.prepWork + estimateData.woodReconditioning + estimateData.drywallRepair) * 60).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Paint & Materials -->
            <div style="margin-bottom: 32px;">
              <h3 style="color: #DCDCAA; font-size: 20px; font-weight: bold; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #DCDCAA;">Paint & Materials</h3>
              <div style="background-color: #1a1a1a; padding: 16px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                  <span style="color: #ffffff;">Paint Costs:</span>
                  <span style="color: #DCDCAA; font-weight: bold;">$${estimateData.paintCost.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <!-- Total Section -->
            <div style="margin-top: 32px; text-align: center; background-color: #059669; padding: 20px; border-radius: 8px;">
              <div style="color: #ffffff; font-size: 28px; font-weight: bold;">
                GRAND TOTAL: $${(((estimateData.prepWork + estimateData.woodReconditioning + estimateData.drywallRepair) * 60) + estimateData.paintCost).toFixed(2)}
              </div>
            </div>

            <!-- Payment Method -->
            <div style="margin-top: 32px; text-align: center;">
              <h3 style="color: #EA580C; font-size: 18px; font-weight: bold; margin: 0 0 8px 0;">
                Payment Method
              </h3>
              <p style="color: #d1d5db; font-size: 14px; line-height: 1.5; font-weight: 600;">
                Please send e-transfer to cortespainter@gmail.com
              </p>
            </div>

            <!-- Disclaimer -->
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #4b5563;">
              <p style="color: #EA580C; font-size: 12px; font-weight: 600; line-height: 1.4; text-align: center;">
                <strong>NOTE:</strong> This is an estimate only. Price excludes structural repairs discovered during work (charged hourly). If total cost may exceed estimate by 20%+, you'll be notified for approval first.
              </p>
            </div>
          </body>
        </html>
      `;
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '8.5in';
      iframe.style.height = '11in';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not access iframe document');

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#1a1a1a',
        width: 816,
        height: null
      });

      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });
      
      const pdfWidth = 216;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      console.log('Sending estimate email with data:', {
        recipientEmail: project.clientEmail,
        clientName: estimateData.clientName,
        estimateNumber: estimateData.estimateNumber,
        projectTitle: estimateData.projectTitle,
        hasPdfData: !!pdfBase64
      });

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
          pdfBase64
        }),
      });

      console.log('Email response status:', response.status);
      const result = await response.json();
      console.log('Email response result:', result);

      if (response.ok && result.success) {
        console.log('Showing success toast notification');
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
    <Card className="w-full max-w-4xl mx-auto bg-black text-white">
      <CardHeader>
        <CardTitle className="text-orange-500">Estimate Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
                value={estimateData.workStages.prep || ''}
                onChange={(e) => setEstimateData(prev => ({
                  ...prev,
                  workStages: { ...prev.workStages, prep: Number(e.target.value) || 0 }
                }))}
                className="bg-gray-800 border-gray-600"
              />
            </div>
            <div>
              <Label>Priming (hours)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={estimateData.workStages.priming || ''}
                onChange={(e) => setEstimateData(prev => ({
                  ...prev,
                  workStages: { ...prev.workStages, priming: Number(e.target.value) || 0 }
                }))}
                className="bg-gray-800 border-gray-600"
              />
            </div>
            <div>
              <Label>Painting (hours)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={estimateData.workStages.painting || ''}
                onChange={(e) => setEstimateData(prev => ({
                  ...prev,
                  workStages: { ...prev.workStages, painting: Number(e.target.value) || 0 }
                }))}
                className="bg-gray-800 border-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Additional Services */}
        <div>
          <h3 className="text-orange-500 font-semibold mb-3">Additional Services</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Wood Reconditioning (hours @ $60/h)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={estimateData.additionalServices.woodReconditioning || ''}
                onChange={(e) => setEstimateData(prev => ({
                  ...prev,
                  additionalServices: { ...prev.additionalServices, woodReconditioning: Number(e.target.value) || 0 }
                }))}
                className="bg-gray-800 border-gray-600"
              />
            </div>
            <div>
              <Label>Drywall Repair (hours @ $60/h)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={estimateData.additionalServices.drywallRepair || ''}
                onChange={(e) => setEstimateData(prev => ({
                  ...prev,
                  additionalServices: { ...prev.additionalServices, drywallRepair: Number(e.target.value) || 0 }
                }))}
                className="bg-gray-800 border-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Paint & Materials */}
        <div>
          <h3 className="text-orange-500 font-semibold mb-3">Paint & Materials</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Paint Supplied By</Label>
              <Select value={estimateData.paintSupplier} onValueChange={(value) => setEstimateData(prev => ({ ...prev, paintSupplier: value }))}>
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A-Frame">A-Frame</SelectItem>
                  <SelectItem value="Client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Paint & Materials Cost</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={estimateData.paintCosts || ''}
                onChange={(e) => setEstimateData(prev => ({ ...prev, paintCosts: Number(e.target.value) || 0 }))}
                className="bg-gray-800 border-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Totals Summary */}
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
      </CardContent>
    </Card>

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

      {/* Work Breakdown */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ 
          fontSize: '12px', 
          fontWeight: '600', 
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '16px'
        }}>
          Work Breakdown
        </h3>
        <div style={{ 
          border: '1px solid #4b5563',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#2d3748' }}>
              <tr>
                <th style={{ 
                  padding: '12px 24px', 
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#d1d5db',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Service
                </th>
                <th style={{ 
                  padding: '12px 24px', 
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#d1d5db',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Hours
                </th>
                <th style={{ 
                  padding: '12px 24px', 
                  textAlign: 'right',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#d1d5db',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {estimateData.workStages.prep > 0 && (
                <tr style={{ background: '#000000' }}>
                  <td style={{ padding: '12px 24px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: '#10b981',
                        marginRight: '12px'
                      }}></div>
                      <span style={{ color: '#ffffff', fontWeight: '500' }}>Prep</span>
                    </div>
                  </td>
                  <td style={{ 
                    padding: '12px 24px', 
                    fontSize: '14px',
                    color: '#d1d5db',
                    textAlign: 'center'
                  }}>
                    {estimateData.workStages.prep}h × $60/h
                  </td>
                  <td style={{ 
                    padding: '12px 24px', 
                    fontSize: '14px',
                    color: '#ffffff',
                    fontWeight: '600',
                    textAlign: 'right'
                  }}>
                    ${(estimateData.workStages.prep * 60).toFixed(2)}
                  </td>
                </tr>
              )}
              {estimateData.workStages.priming > 0 && (
                <tr style={{ background: '#1f2937' }}>
                  <td style={{ padding: '12px 24px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: '#10b981',
                        marginRight: '12px'
                      }}></div>
                      <span style={{ color: '#ffffff', fontWeight: '500' }}>Priming</span>
                    </div>
                  </td>
                  <td style={{ 
                    padding: '12px 24px', 
                    fontSize: '14px',
                    color: '#d1d5db',
                    textAlign: 'center'
                  }}>
                    {estimateData.workStages.priming}h × $60/h
                  </td>
                  <td style={{ 
                    padding: '12px 24px', 
                    fontSize: '14px',
                    color: '#ffffff',
                    fontWeight: '600',
                    textAlign: 'right'
                  }}>
                    ${(estimateData.workStages.priming * 60).toFixed(2)}
                  </td>
                </tr>
              )}
              {estimateData.workStages.painting > 0 && (
                <tr style={{ background: '#000000' }}>
                  <td style={{ padding: '12px 24px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: '#10b981',
                        marginRight: '12px'
                      }}></div>
                      <span style={{ color: '#ffffff', fontWeight: '500' }}>Painting</span>
                    </div>
                  </td>
                  <td style={{ 
                    padding: '12px 24px', 
                    fontSize: '14px',
                    color: '#d1d5db',
                    textAlign: 'center'
                  }}>
                    {estimateData.workStages.painting}h × $60/h
                  </td>
                  <td style={{ 
                    padding: '12px 24px', 
                    fontSize: '14px',
                    color: '#ffffff',
                    fontWeight: '600',
                    textAlign: 'right'
                  }}>
                    ${(estimateData.workStages.painting * 60).toFixed(2)}
                  </td>
                </tr>
              )}
              {estimateData.additionalServices.woodReconditioning > 0 && (
                <tr style={{ background: '#1f2937' }}>
                  <td style={{ padding: '12px 24px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: '#10b981',
                        marginRight: '12px'
                      }}></div>
                      <span style={{ color: '#ffffff', fontWeight: '500' }}>Wood Reconditioning</span>
                    </div>
                  </td>
                  <td style={{ 
                    padding: '12px 24px', 
                    fontSize: '14px',
                    color: '#d1d5db',
                    textAlign: 'center'
                  }}>
                    {estimateData.additionalServices.woodReconditioning}h × $60/h
                  </td>
                  <td style={{ 
                    padding: '12px 24px', 
                    fontSize: '14px',
                    color: '#ffffff',
                    fontWeight: '600',
                    textAlign: 'right'
                  }}>
                    ${(estimateData.additionalServices.woodReconditioning * 60).toFixed(2)}
                  </td>
                </tr>
              )}
              {estimateData.additionalServices.drywallRepair > 0 && (
                <tr style={{ background: '#000000' }}>
                  <td style={{ padding: '12px 24px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: '#10b981',
                        marginRight: '12px'
                      }}></div>
                      <span style={{ color: '#ffffff', fontWeight: '500' }}>Drywall Repair</span>
                    </div>
                  </td>
                  <td style={{ 
                    padding: '12px 24px', 
                    fontSize: '14px',
                    color: '#d1d5db',
                    textAlign: 'center'
                  }}>
                    {estimateData.additionalServices.drywallRepair}h × $60/h
                  </td>
                  <td style={{ 
                    padding: '12px 24px', 
                    fontSize: '14px',
                    color: '#ffffff',
                    fontWeight: '600',
                    textAlign: 'right'
                  }}>
                    ${(estimateData.additionalServices.drywallRepair * 60).toFixed(2)}
                  </td>
                </tr>
              )}
              {paintCosts > 0 && (
                <tr style={{ background: '#1f2937' }}>
                  <td style={{ padding: '12px 24px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: '#10b981',
                        marginRight: '12px'
                      }}></div>
                      <span style={{ color: '#ffffff', fontWeight: '500' }}>Paint & Materials</span>
                    </div>
                  </td>
                  <td style={{ 
                    padding: '12px 24px', 
                    fontSize: '14px',
                    color: '#d1d5db',
                    textAlign: 'center'
                  }}>
                    -
                  </td>
                  <td style={{ 
                    padding: '12px 24px', 
                    fontSize: '14px',
                    color: '#ffffff',
                    fontWeight: '600',
                    textAlign: 'right'
                  }}>
                    ${paintCosts.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals Section */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
        <div style={{ 
          width: '320px',
          background: '#2d3748',
          borderRadius: '8px',
          padding: '24px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '12px',
            color: '#d1d5db'
          }}>
            <span style={{ fontWeight: '500' }}>Subtotal</span>
            <span style={{ fontWeight: '600' }}>${laborSubtotal.toFixed(2)}</span>
          </div>
          {paintCosts > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '12px',
              color: '#d1d5db'
            }}>
              <span style={{ fontWeight: '500' }}>Paint & Materials</span>
              <span style={{ fontWeight: '600' }}>${paintCosts.toFixed(2)}</span>
            </div>
          )}
          
          <div style={{ 
            borderTop: '1px solid #4b5563',
            paddingTop: '12px',
            marginTop: '12px'
          }}>
            <div style={{ 
              background: '#059669',
              borderRadius: '8px',
              padding: '16px 24px',
              textAlign: 'center'
            }}>
              <div style={{ 
                color: '#ffffff',
                fontSize: '20px',
                fontWeight: '700'
              }}>
                Total: ${grandTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div style={{ 
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '1px solid #4b5563'
      }}>
        <h3 style={{ 
          fontSize: '12px', 
          fontWeight: '600', 
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '12px'
        }}>
          Payment Method
        </h3>
        <p style={{ 
          color: '#d1d5db',
          fontSize: '14px',
          lineHeight: '1.5',
          textAlign: 'center',
          fontWeight: '600'
        }}>
          Please send e-transfer to cortespainter@gmail.com
        </p>
      </div>

      {/* Disclaimer */}
      <div style={{ 
        marginTop: '24px',
        paddingTop: '16px',
        borderTop: '1px solid #4b5563'
      }}>
        <p style={{ 
          color: '#EA580C',
          fontSize: '12px',
          fontWeight: '600',
          lineHeight: '1.4',
          textAlign: 'center'
        }}>
          <strong>NOTE:</strong> This is an estimate only. Price excludes structural repairs discovered during work (charged hourly). If total cost may exceed estimate by 20%+, you'll be notified for approval first.
        </p>
      </div>
    </div>
  );
}