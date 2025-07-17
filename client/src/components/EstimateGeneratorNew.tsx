import React, { useState, useEffect } from 'react';
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
    try {
      setIsGenerating(true);
      
      // Create the HTML content matching the invoice dark theme
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>A-Frame Painting Estimate</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background: #000000;
            color: #ffffff;
            line-height: 1.4;
            width: 794px;
            min-height: 1122px;
            padding: 32px;
        }
        
        .estimate-container {
            width: 100%;
            margin: 0 auto;
            background: #000000;
        }
        
        /* Header Section with Logo */
        .header {
            margin-bottom: 32px;
        }
        
        .logo-section {
            display: flex;
            justify-content: center;
            margin-bottom: 32px;
        }
        
        .logo-section img {
            height: 96px;
            width: auto;
        }
        
        /* Estimate Title and Info */
        .title-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
            padding-bottom: 16px;
            border-bottom: 1px solid #4b5563;
        }
        
        .title-section h2 {
            font-size: 48px;
            font-weight: 700;
            color: #EA580C;
        }
        
        .title-section p {
            color: #9ca3af;
            margin-top: 4px;
        }
        
        .estimate-meta {
            text-align: right;
        }
        
        .estimate-meta p {
            color: #d1d5db;
            font-size: 14px;
            margin-bottom: 4px;
        }
        
        .estimate-meta .label {
            color: #9ca3af;
        }
        
        .estimate-meta .value {
            font-weight: 600;
        }
        
        /* Client Info Section */
        .client-section {
            margin-bottom: 32px;
        }
        
        .client-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
        }
        
        .client-box h3 {
            font-size: 12px;
            font-weight: 600;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }
        
        .client-box p {
            color: #ffffff;
            font-size: 16px;
            margin-bottom: 4px;
            line-height: 1.3;
        }
        
        .client-box p.name {
            font-weight: 600;
            font-size: 18px;
        }
        
        .client-box p.normal {
            color: #d1d5db;
        }
        
        /* Work Breakdown Section */
        .work-section {
            margin-bottom: 32px;
        }
        
        .work-section h3 {
            font-size: 12px;
            font-weight: 600;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 16px;
        }
        
        .work-table-container {
            overflow: hidden;
            border-radius: 8px;
            border: 1px solid #4b5563;
        }
        
        .work-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .work-table thead {
            background: #2d3748;
        }
        
        .work-table th {
            padding: 12px 24px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #d1d5db;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .work-table th.center { text-align: center; }
        .work-table th.right { text-align: right; }
        
        .work-table tbody tr:nth-child(even) {
            background: #1f2937;
        }
        
        .work-table tbody tr:nth-child(odd) {
            background: #000000;
        }
        
        .work-table td {
            padding: 12px 24px;
            font-size: 14px;
        }
        
        .work-name {
            display: flex;
            align-items: center;
            color: #ffffff;
            font-weight: 500;
        }
        
        .work-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10b981;
            margin-right: 12px;
        }
        
        .work-rate {
            color: #d1d5db;
            text-align: center;
        }
        
        .work-total {
            color: #ffffff;
            font-weight: 600;
            text-align: right;
        }
        
        /* Totals Section */
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 32px;
        }
        
        .totals-box {
            width: 320px;
            background: #2d3748;
            border-radius: 8px;
            padding: 24px;
        }
        
        .total-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            color: #d1d5db;
        }
        
        .total-line .label {
            font-weight: 500;
        }
        
        .total-line .amount {
            font-weight: 600;
        }
        
        .grand-total {
            border-top: 1px solid #4b5563;
            padding-top: 12px;
            margin-top: 12px;
        }
        
        .grand-total-box {
            background: #059669;
            border-radius: 8px;
            padding: 16px 24px;
            text-align: center;
        }
        
        .grand-total-box .total-text {
            color: #ffffff;
            font-size: 20px;
            font-weight: 700;
        }
        
        /* Payment Method Section */
        .payment-section {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #4b5563;
        }
        
        .payment-section h3 {
            font-size: 12px;
            font-weight: 600;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }
        
        .payment-section p {
            color: #d1d5db;
            font-size: 14px;
            line-height: 1.5;
            text-align: center;
            font-weight: 600;
        }
        
        /* Disclaimer */
        .disclaimer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #4b5563;
        }
        
        .disclaimer p {
            color: #EA580C;
            font-size: 12px;
            font-weight: 600;
            line-height: 1.4;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="estimate-container">
        <!-- Header Section -->
        <div class="header">
            <!-- Logo Only -->
            <div class="logo-section">
                <img src="/aframe-logo.png" alt="A-Frame Painting Logo" />
            </div>
        </div>

        <!-- Estimate Title and Info -->
        <div class="title-section">
            <div>
                <h2>Estimate</h2>
                <p>Professional Painting Services</p>
            </div>
            <div class="estimate-meta">
                <p><span class="label">Estimate #:</span> <span class="value">${estimateData.estimateNumber}</span></p>
                <p><span class="label">Date:</span> <span class="value">${estimateData.date}</span></p>
            </div>
        </div>

        <!-- Client Info -->
        <div class="client-section">
            <div class="client-grid">
                <div class="client-box">
                    <h3>Estimate To</h3>
                    <p class="name">${project?.clientName || 'Client Name'}</p>
                    <p class="normal">${project?.address || 'Address'}</p>
                    <p class="normal">${project?.clientCity && project?.clientPostal ? `${project.clientCity}, ${project.clientPostal}` : 'City, Postal'}</p>
                    ${project?.clientPhone ? `<p class="normal">${project.clientPhone}</p>` : ''}
                    ${project?.clientEmail ? `<p class="normal">${project.clientEmail}</p>` : ''}
                </div>
                <div class="client-box">
                    <h3>From</h3>
                    <p class="name">A-Frame Painting</p>
                    <p class="normal">884 Hayes Rd</p>
                    <p class="normal">Manson's Landing, BC V0P1K0</p>
                    <p class="normal">cortespainter@gmail.com</p>
                </div>
            </div>
        </div>

        <!-- Work Breakdown -->
        <div class="work-section">
            <h3>Work Breakdown</h3>
            <div class="work-table-container">
                <table class="work-table">
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th class="center">Hours</th>
                            <th class="right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${estimateData.workStages.prep > 0 ? `
                        <tr>
                            <td>
                                <div class="work-name">
                                    <div class="work-dot"></div>
                                    <span>Prep</span>
                                </div>
                            </td>
                            <td class="work-rate">${estimateData.workStages.prep}h × $60/h</td>
                            <td class="work-total">$${(estimateData.workStages.prep * 60).toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        ${estimateData.workStages.priming > 0 ? `
                        <tr>
                            <td>
                                <div class="work-name">
                                    <div class="work-dot"></div>
                                    <span>Priming</span>
                                </div>
                            </td>
                            <td class="work-rate">${estimateData.workStages.priming}h × $60/h</td>
                            <td class="work-total">$${(estimateData.workStages.priming * 60).toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        ${estimateData.workStages.painting > 0 ? `
                        <tr>
                            <td>
                                <div class="work-name">
                                    <div class="work-dot"></div>
                                    <span>Painting</span>
                                </div>
                            </td>
                            <td class="work-rate">${estimateData.workStages.painting}h × $60/h</td>
                            <td class="work-total">$${(estimateData.workStages.painting * 60).toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        ${estimateData.additionalServices.woodReconditioning > 0 ? `
                        <tr>
                            <td>
                                <div class="work-name">
                                    <div class="work-dot"></div>
                                    <span>Wood Reconditioning</span>
                                </div>
                            </td>
                            <td class="work-rate">${estimateData.additionalServices.woodReconditioning}h × $60/h</td>
                            <td class="work-total">$${(estimateData.additionalServices.woodReconditioning * 60).toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        ${estimateData.additionalServices.drywallRepair > 0 ? `
                        <tr>
                            <td>
                                <div class="work-name">
                                    <div class="work-dot"></div>
                                    <span>Drywall Repair</span>
                                </div>
                            </td>
                            <td class="work-rate">${estimateData.additionalServices.drywallRepair}h × $60/h</td>
                            <td class="work-total">$${(estimateData.additionalServices.drywallRepair * 60).toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        ${paintCosts > 0 ? `
                        <tr>
                            <td>
                                <div class="work-name">
                                    <div class="work-dot"></div>
                                    <span>Paint & Materials</span>
                                </div>
                            </td>
                            <td class="work-rate">-</td>
                            <td class="work-total">$${paintCosts.toFixed(2)}</td>
                        </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Totals Section -->
        <div class="totals-section">
            <div class="totals-box">
                <div class="total-line">
                    <span class="label">Subtotal</span>
                    <span class="amount">$${laborSubtotal.toFixed(2)}</span>
                </div>
                ${paintCosts > 0 ? `
                <div class="total-line">
                    <span class="label">Paint & Materials</span>
                    <span class="amount">$${paintCosts.toFixed(2)}</span>
                </div>
                ` : ''}
                
                <div class="grand-total">
                    <div class="grand-total-box">
                        <div class="total-text">Total: $${grandTotal.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Payment Method -->
        <div class="payment-section">
            <h3>Payment Method</h3>
            <p>Please send e-transfer to cortespainter@gmail.com</p>
        </div>

        <!-- Disclaimer -->
        <div class="disclaimer">
            <p><strong>NOTE:</strong> This is an estimate only. Price excludes structural repairs discovered during work (charged hourly). If total cost may exceed estimate by 20%+, you'll be notified for approval first.</p>
        </div>
    </div>
</body>
</html>
      `;

      // Create a temporary iframe to render the HTML cleanly
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

      // Wait for fonts and content to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture the iframe content
      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#1a1a1a',
        width: 816, // 8.5 inches at 96 DPI
        height: null // Auto height
      });

      // Remove iframe
      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF with proper dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });
      
      // Calculate the image dimensions to fit letter size
      const pdfWidth = 216; // Letter width in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const filename = `Estimate-${estimateData.estimateNumber}-${estimateData.clientName.replace(/\s+/g, '-')}.pdf`;
      
      // Download PDF
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Generated Successfully",
        description: "Estimate PDF downloaded",
      });
      
    } catch (error) {
      console.error('PDF generation failed:', error);
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
      const htmlContent = `<!-- Same HTML template as above -->`;
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
  );
}