import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Download, Send, Plus, Trash2, User, MapPin, Phone, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Project, Receipt, DailyHours } from '@shared/schema';

interface InvoiceGeneratorProps {
  project: Project;
  dailyHours: DailyHours[];
  receipts: Receipt[];
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoiceGeneratorEnhanced({ 
  project, 
  dailyHours, 
  receipts, 
  isOpen, 
  onClose 
}: InvoiceGeneratorProps) {

  const { toast } = useToast();
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: 101,
    date: new Date().toISOString().split('T')[0],
    
    // Business info (A-Frame Painting details)
    businessName: 'A-Frame Painting',
    businessAddress: '884 Hayes Rd',
    businessCity: 'Manson\'s Landing, BC',
    businessPostal: 'V0P1K0',
    businessEmail: 'cortespainter@gmail.com',
    businessLogo: '/aframe-logo.png',
    
    // Client info (populated from project)
    clientName: project.clientName || '',
    clientEmail: project.clientEmail || '',
    clientAddress: project.address || '',
    clientCity: project.clientCity || '',
    clientPostal: project.clientPostal || '',
    clientPhone: project.clientPhone || '',
    
    // Line items (populated from daily hours)
    lineItems: dailyHours.map(hour => ({
      description: hour.description || 'Painting',
      hours: hour.hours,
      unitPrice: project.hourlyRate || 60,
      detail: '',
      total: hour.hours * (project.hourlyRate || 60)
    })),
    
    // Additional supplies cost
    additionalSupplies: 0,
    
    // Notes and payment
    notes: 'Please send e-transfer to cortespainter@gmail.com\n\nThank you for choosing A-Frame Painting!',
    gstRate: 0.05,
    
    // Receipt attachments
    attachReceipts: false
  });

  // Brand colors - A-Frame Painting theme
  const [brandColors, setBrandColors] = useState({
    primary: '#EA580C',         // Burnt orange - A-Frame brand color
    secondary: '#1E40AF',       // Blue for accents
    accent: '#059669',          // Green for success/send buttons
    danger: '#ef4444',          // Red for delete actions
    background: '#f8fafc',      // Light background
    text: '#1f2937',            // Dark text
    textLight: '#6b7280'        // Light text
  });

  // Dark mode colors for the app interface
  const darkTheme = {
    background: '#000000',      // Pure black for logo integration
    cardBg: '#1e293b',
    headerBg: '#334155',
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    border: '#475569',
    inputBg: '#334155',
    accent: brandColors.accent
  };

  const invoiceRef = useRef<HTMLDivElement>(null);

  const calculateLineTotal = (hours: number, unitPrice: number) => {
    return hours * unitPrice;
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const newLineItems = [...invoiceData.lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    
    if (field === 'hours' || field === 'unitPrice') {
      newLineItems[index].total = calculateLineTotal(
        field === 'hours' ? value : newLineItems[index].hours,
        field === 'unitPrice' ? value : newLineItems[index].unitPrice
      );
    }
    
    setInvoiceData({ ...invoiceData, lineItems: newLineItems });
  };

  const addLineItem = () => {
    setInvoiceData({
      ...invoiceData,
      lineItems: [
        ...invoiceData.lineItems,
        { description: 'Additional Service', hours: 0, unitPrice: project.hourlyRate || 60, detail: '', total: 0 }
      ]
    });
  };

  const removeLineItem = (index: number) => {
    const newLineItems = invoiceData.lineItems.filter((_, i) => i !== index);
    setInvoiceData({ ...invoiceData, lineItems: newLineItems });
  };

  const calculateSubtotal = () => {
    const laborTotal = invoiceData.lineItems.reduce((sum, item) => sum + item.total, 0);
    const materialsTotal = receipts.reduce((sum, receipt) => sum + parseFloat(receipt.amount.toString()), 0);
    return laborTotal + materialsTotal + invoiceData.additionalSupplies;
  };

  const calculateGST = () => {
    // GST only on labor and additional supplies, not on receipts (taxes already included)
    const laborTotal = invoiceData.lineItems.reduce((sum, item) => sum + item.total, 0);
    return (laborTotal + invoiceData.additionalSupplies) * invoiceData.gstRate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const generatePDF = async () => {
    try {
      const invoiceElement = invoiceRef.current;
      if (!invoiceElement) {
        toast({
          title: "Error",
          description: "Invoice preview not found",
          variant: "destructive"
        });
        return;
      }

      // Temporarily show the hidden preview
      invoiceElement.style.display = 'block';
      invoiceElement.style.position = 'absolute';
      invoiceElement.style.left = '-9999px';

      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // Hide the preview again
      invoiceElement.style.display = 'none';

      const imgData = canvas.getDataURL('image/png');
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

      // Add receipt attachments if selected
      if (invoiceData.attachReceipts && receipts.length > 0) {
        for (const receipt of receipts) {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = `/uploads/${receipt.filename}`;
            });

            pdf.addPage();
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            
            const receiptImgData = canvas.toDataURL('image/jpeg');
            const receiptAspectRatio = img.height / img.width;
            const receiptWidth = 180;
            const receiptHeight = receiptWidth * receiptAspectRatio;
            
            pdf.addImage(receiptImgData, 'JPEG', 15, 15, receiptWidth, receiptHeight);
          } catch (error) {
            console.error(`Failed to add receipt ${receipt.filename}:`, error);
          }
        }
      }

      const filename = `Invoice-${invoiceData.invoiceNumber}-${invoiceData.clientName.replace(/\s+/g, '')}.pdf`;
      pdf.save(filename);
      
      toast({
        title: "Success",
        description: "Invoice PDF generated successfully"
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive"
      });
    }
  };

  const sendInvoice = async () => {
    try {
      setIsSending(true);
      
      // First generate the PDF
      const printElement = printRef.current;
      if (!printElement) {
        throw new Error('Print element not found');
      }

      const canvas = await html2canvas(printElement, {
        scale: 1,
        useCORS: true,
        allowTaint: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.7);
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
      console.log('Image data length:', imgData.length);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Add receipt attachments if selected
      if (invoiceData.attachReceipts && receipts.length > 0) {
        for (const receipt of receipts) {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = `/uploads/${receipt.filename}`;
            });

            pdf.addPage();
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            
            const receiptImgData = canvas.toDataURL('image/jpeg');
            const receiptAspectRatio = img.height / img.width;
            const receiptWidth = 180;
            const receiptHeight = receiptWidth * receiptAspectRatio;
            
            pdf.addImage(receiptImgData, 'JPEG', 15, 15, receiptWidth, receiptHeight);
          } catch (error) {
            console.error(`Failed to add receipt ${receipt.filename}:`, error);
          }
        }
      }

      const pdfData = pdf.output('datauristring');
      console.log('PDF pages:', pdf.getNumberOfPages());
      console.log('PDF size estimate:', pdfData.length * 0.75, 'bytes');

      // Create email content
      const subject = `Invoice #${invoiceData.invoiceNumber} - A-Frame Painting`;
      const lineItemsText = invoiceData.lineItems
        .filter(item => item.hours > 0 || item.description.trim() !== '')
        .map(item => `• ${item.description}: ${item.hours} hrs @ $${item.unitPrice}/hr = $${item.total.toFixed(2)}`)
        .join('\n');

      const materialsText = receipts.length > 0 
        ? receipts.map(receipt => `• ${receipt.vendor}: $${receipt.amount.toFixed(2)}`).join('\n')
        : '';

      const message = `Dear ${invoiceData.clientName},

Please find your invoice attached for painting services completed.

INVOICE #${invoiceData.invoiceNumber}
Date: ${invoiceData.date}
From: A-Frame Painting

Services Provided:
${lineItemsText}

${materialsText ? `Materials:
${materialsText}

` : ''}${invoiceData.additionalSupplies > 0 ? `Additional Supplies: $${invoiceData.additionalSupplies.toFixed(2)}

` : ''}TOTALS:
Subtotal: $${calculateSubtotal().toFixed(2)}
GST (5%): $${calculateGST().toFixed(2)}
TOTAL AMOUNT: $${calculateTotal().toFixed(2)} CAD

Payment Instructions:
${invoiceData.notes}

Thank you for choosing A-Frame Painting for your painting needs!

Best regards,
A-Frame Painting
cortespainter@gmail.com`;

      // Send email with PDF attachment
      const response = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: invoiceData.clientEmail,
          subject: subject,
          message: message,
          pdfData: pdfData,
          receiptFilenames: invoiceData.attachReceipts ? receipts.map(r => r.filename) : []
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      toast({
        title: "Invoice sent successfully!",
        description: "The invoice has been sent to your client."
      });

      // Auto-close dialog after 5 seconds
      setTimeout(() => {
        onClose();
      }, 5000);

    } catch (error) {
      console.error('Email sending failed:', error);
      toast({
        title: "Error",
        description: "Failed to send invoice email",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: darkTheme.background }}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between" style={{ color: darkTheme.text }}>
            <span>Invoice Generator - A-Frame Painting</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              style={{ color: darkTheme.text }}
            >
              <X size={16} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6" style={{ color: darkTheme.text }}>
          {/* Business & Invoice Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <User className="mr-2 h-5 w-5" />
                Business Information
              </h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={invoiceData.businessName}
                  onChange={(e) => setInvoiceData({...invoiceData, businessName: e.target.value})}
                  className="w-full p-3 border rounded-md"
                  style={{ 
                    backgroundColor: darkTheme.inputBg,
                    borderColor: darkTheme.border,
                    color: darkTheme.text
                  }}
                  placeholder="Business Name"
                />
                <input
                  type="text"
                  value={invoiceData.businessAddress}
                  onChange={(e) => setInvoiceData({...invoiceData, businessAddress: e.target.value})}
                  className="w-full p-3 border rounded-md"
                  style={{ 
                    backgroundColor: darkTheme.inputBg,
                    borderColor: darkTheme.border,
                    color: darkTheme.text
                  }}
                  placeholder="Address"
                />
                <input
                  type="email"
                  value={invoiceData.businessEmail}
                  onChange={(e) => setInvoiceData({...invoiceData, businessEmail: e.target.value})}
                  className="w-full p-3 border rounded-md"
                  style={{ 
                    backgroundColor: darkTheme.inputBg,
                    borderColor: darkTheme.border,
                    color: darkTheme.text
                  }}
                  placeholder="Email"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Invoice Details
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: darkTheme.textSecondary }}>Invoice Number</label>
                  <input
                    type="number"
                    value={invoiceData.invoiceNumber}
                    onChange={(e) => setInvoiceData({...invoiceData, invoiceNumber: parseInt(e.target.value)})}
                    className="w-full p-3 border rounded-md"
                    style={{ 
                      backgroundColor: darkTheme.inputBg,
                      borderColor: darkTheme.border,
                      color: darkTheme.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: darkTheme.textSecondary }}>Date</label>
                  <input
                    type="date"
                    value={invoiceData.date}
                    onChange={(e) => setInvoiceData({...invoiceData, date: e.target.value})}
                    className="w-full p-3 border rounded-md"
                    style={{ 
                      backgroundColor: darkTheme.inputBg,
                      borderColor: darkTheme.border,
                      color: darkTheme.text
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Client Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={invoiceData.clientName}
                onChange={(e) => setInvoiceData({...invoiceData, clientName: e.target.value})}
                className="p-3 border rounded-md"
                style={{ 
                  backgroundColor: darkTheme.inputBg,
                  borderColor: darkTheme.border,
                  color: darkTheme.text
                }}
                placeholder="Client Name"
              />
              <input
                type="email"
                value={invoiceData.clientEmail}
                onChange={(e) => setInvoiceData({...invoiceData, clientEmail: e.target.value})}
                className="p-3 border rounded-md"
                style={{ 
                  backgroundColor: darkTheme.inputBg,
                  borderColor: darkTheme.border,
                  color: darkTheme.text
                }}
                placeholder="Client Email"
              />
              <input
                type="text"
                value={invoiceData.clientAddress}
                onChange={(e) => setInvoiceData({...invoiceData, clientAddress: e.target.value})}
                className="p-3 border rounded-md"
                style={{ 
                  backgroundColor: darkTheme.inputBg,
                  borderColor: darkTheme.border,
                  color: darkTheme.text
                }}
                placeholder="Client Address"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={invoiceData.clientCity}
                  onChange={(e) => setInvoiceData({...invoiceData, clientCity: e.target.value})}
                  className="p-3 border rounded-md"
                  style={{ 
                    backgroundColor: darkTheme.inputBg,
                    borderColor: darkTheme.border,
                    color: darkTheme.text
                  }}
                  placeholder="City, Province"
                />
                <input
                  type="text"
                  value={invoiceData.clientPostal}
                  onChange={(e) => setInvoiceData({...invoiceData, clientPostal: e.target.value})}
                  className="p-3 border rounded-md"
                  style={{ 
                    backgroundColor: darkTheme.inputBg,
                    borderColor: darkTheme.border,
                    color: darkTheme.text
                  }}
                  placeholder="Postal Code"
                />
              </div>
            </div>
          </div>

          {/* Services & Labor */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Services & Labor</h3>
              <Button
                onClick={addLineItem}
                className="flex items-center"
                style={{ backgroundColor: brandColors.accent }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border" style={{ borderColor: darkTheme.border }}>
                <thead>
                  <tr style={{ backgroundColor: darkTheme.inputBg }}>
                    <th className="border p-3 text-left" style={{ borderColor: darkTheme.border }}>Description</th>
                    <th className="border p-3 text-center" style={{ borderColor: darkTheme.border }}>Hours</th>
                    <th className="border p-3 text-center" style={{ borderColor: darkTheme.border }}>Rate ($/hr)</th>
                    <th className="border p-3 text-right" style={{ borderColor: darkTheme.border }}>Total</th>
                    <th className="border p-3 text-center" style={{ borderColor: darkTheme.border }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className="border p-2" style={{ borderColor: darkTheme.border }}>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          className="w-full p-2 border-0 rounded"
                          style={{ 
                            backgroundColor: darkTheme.cardBg,
                            color: darkTheme.text
                          }}
                          placeholder="Service description"
                        />
                      </td>
                      <td className="border p-2" style={{ borderColor: darkTheme.border }}>
                        <input
                          type="number"
                          step="0.5"
                          value={item.hours}
                          onChange={(e) => updateLineItem(index, 'hours', parseFloat(e.target.value) || 0)}
                          className="w-full p-2 border-0 rounded text-center"
                          style={{ 
                            backgroundColor: darkTheme.cardBg,
                            color: darkTheme.text
                          }}
                        />
                      </td>
                      <td className="border p-2" style={{ borderColor: darkTheme.border }}>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full p-2 border-0 rounded text-center"
                          style={{ 
                            backgroundColor: darkTheme.cardBg,
                            color: darkTheme.text
                          }}
                        />
                      </td>
                      <td className="border p-2 text-right font-semibold" style={{ borderColor: darkTheme.border }}>
                        ${item.total.toFixed(2)}
                      </td>
                      <td className="border p-2 text-center" style={{ borderColor: darkTheme.border }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                          style={{ color: brandColors.danger }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Materials & Additional Supplies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Materials (from receipts)</h3>
              <div className="space-y-2">
                {receipts.map((receipt) => (
                  <div key={receipt.id} className="flex justify-between p-2 rounded" style={{ backgroundColor: darkTheme.inputBg }}>
                    <span>{receipt.vendor}</span>
                    <span>${receipt.amount.toFixed(2)}</span>
                  </div>
                ))}
                {receipts.length === 0 && (
                  <p style={{ color: darkTheme.textSecondary }}>No receipts uploaded</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Supplies</h3>
              <input
                type="number"
                step="0.01"
                value={invoiceData.additionalSupplies}
                onChange={(e) => setInvoiceData({...invoiceData, additionalSupplies: parseFloat(e.target.value) || 0})}
                className="w-full p-3 border rounded-md"
                style={{ 
                  backgroundColor: darkTheme.inputBg,
                  borderColor: darkTheme.border,
                  color: darkTheme.text
                }}
                placeholder="Additional supplies cost"
              />
            </div>
          </div>

          {/* Receipt Attachments */}
          {receipts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">PDF Attachments</h3>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={invoiceData.attachReceipts}
                  onChange={(e) => setInvoiceData({...invoiceData, attachReceipts: e.target.checked})}
                  className="rounded"
                />
                <span>Attach receipt photos to PDF (as additional pages)</span>
              </label>
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between py-2 border-b" style={{ borderColor: darkTheme.border }}>
                <span className="font-medium">Subtotal:</span>
                <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b" style={{ borderColor: darkTheme.border }}>
                <span className="font-medium">GST (5%):</span>
                <span className="font-semibold">${calculateGST().toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-lg font-bold px-4 rounded" style={{ backgroundColor: brandColors.primary, color: 'white' }}>
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: darkTheme.textSecondary }}>Notes & Payment Instructions</label>
            <textarea
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
              className="w-full p-3 border rounded-md"
              style={{ 
                backgroundColor: darkTheme.inputBg,
                borderColor: darkTheme.border,
                color: darkTheme.text
              }}
              rows={3}
              placeholder="Payment instructions, additional notes, etc."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 pt-6 border-t" style={{ borderColor: darkTheme.border }}>
            <Button
              onClick={generatePDF}
              className="flex items-center"
              style={{ backgroundColor: brandColors.primary }}
            >
              <Download className="mr-2 h-5 w-5" />
              Generate PDF
            </Button>
            <Button
              onClick={sendInvoice}
              disabled={!invoiceData.clientEmail}
              className="flex items-center"
              style={{ backgroundColor: invoiceData.clientEmail ? brandColors.secondary : '#9ca3af' }}
            >
              <Send className="mr-2 h-5 w-5" />
              Open Gmail
            </Button>
          </div>
        </div>

        {/* Hidden Invoice Preview for PDF Generation */}
        <div ref={invoiceRef} className="hidden bg-white p-8" style={{ width: '210mm', minHeight: '297mm' }}>
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-start space-x-4">
              <img 
                src={invoiceData.businessLogo} 
                alt="A-Frame Painting Logo" 
                className="h-24 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{invoiceData.businessName}</h1>
                <div className="mt-2 text-gray-600">
                  <p>{invoiceData.businessAddress}</p>
                  <p>{invoiceData.businessCity}</p>
                  <p>{invoiceData.businessPostal}</p>
                  <p>{invoiceData.businessEmail}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-orange-600">INVOICE</h2>
              <p className="mt-2 text-gray-600">Invoice #{invoiceData.invoiceNumber}</p>
              <p className="text-gray-600">Date: {invoiceData.date}</p>
            </div>
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Bill To:</h3>
              <div className="text-gray-700">
                <p>{invoiceData.clientName}</p>
                <p>{invoiceData.clientAddress}</p>
                <p>{invoiceData.clientCity} {invoiceData.clientPostal}</p>
                {invoiceData.clientEmail && <p>{invoiceData.clientEmail}</p>}
                {invoiceData.clientPhone && <p>{invoiceData.clientPhone}</p>}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">From:</h3>
              <div className="text-gray-700">
                <p>{invoiceData.businessName}</p>
                <p>{invoiceData.businessEmail}</p>
              </div>
            </div>
          </div>

          {/* Services Table */}
          <table className="w-full border-collapse border border-gray-300 mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-left">Description</th>
                <th className="border border-gray-300 p-3 text-center">Hours</th>
                <th className="border border-gray-300 p-3 text-center">Rate</th>
                <th className="border border-gray-300 p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.lineItems.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-3">{item.description}</td>
                  <td className="border border-gray-300 p-3 text-center">{item.hours}</td>
                  <td className="border border-gray-300 p-3 text-center">${item.unitPrice}</td>
                  <td className="border border-gray-300 p-3 text-right">${item.total.toFixed(2)}</td>
                </tr>
              ))}
              {receipts.map((receipt, index) => (
                <tr key={`receipt-${index}`}>
                  <td className="border border-gray-300 p-3">Materials - {receipt.vendor}</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-right">${receipt.amount.toFixed(2)}</td>
                </tr>
              ))}
              {invoiceData.additionalSupplies > 0 && (
                <tr>
                  <td className="border border-gray-300 p-3">Additional Supplies</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-center">-</td>
                  <td className="border border-gray-300 p-3 text-right">${invoiceData.additionalSupplies.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between py-2 border-b border-gray-300">
                <span className="font-medium">Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-300">
                <span className="font-medium">GST (5%):</span>
                <span>${calculateGST().toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-3 text-lg font-bold bg-green-600 text-white px-4 rounded mt-2">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoiceData.notes && (
            <div className="mt-8">
              <h3 className="font-semibold text-gray-800 mb-2">Notes:</h3>
              <div className="text-gray-700 whitespace-pre-line">{invoiceData.notes}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}