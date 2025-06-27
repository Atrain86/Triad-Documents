import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Calendar, Download, Send, Plus, Trash2, User, MapPin, Phone, Mail, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Project, Receipt, DailyHours } from '@shared/schema';

interface InvoiceGeneratorProps {
  project: Project;
  dailyHours: DailyHours[];
  receipts: Receipt[];
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoiceGenerator({ 
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
    
    // Business info (your details)
    businessName: 'A-Frame Painting',
    businessAddress: '884 Hayes Rd',
    businessCity: 'Manson\'s Landing, BC',
    businessPostal: 'V0P1K0',
    businessEmail: 'cortespainter@gmail.com',
    businessLogo: '/aframe-logo.png', // A-Frame Painting logo
    
    // Client info (populated from project)
    clientName: project.clientName || '',
    clientEmail: project.clientEmail || '',
    clientAddress: project.address || '',
    clientCity: project.clientCity || '',
    clientPostal: project.clientPostal || '',
    clientPhone: project.clientPhone || '',
    
    // Line items (populated from daily hours)
    lineItems: dailyHours.length > 0 ? dailyHours.map(hour => ({
      description: hour.description || 'Painting Services',
      hours: hour.hours,
      unitPrice: hour.hourlyRate || 60,
      detail: `Date: ${new Date(hour.date).toLocaleDateString()}`,
      total: hour.hours * (hour.hourlyRate || 60)
    })) : [{
      description: 'Painting Services',
      hours: 0,
      unitPrice: 60,
      detail: '',
      total: 0
    }],
    
    // Notes and payment
    notes: 'Please send e-transfer to cortespainter@gmail.com',
    emailMessage: 'Please find attached your invoice for painting services.',
    gstRate: 0.05, // 5% GST on labor services only
    suppliesCost: 0,
    selectedReceipts: new Set<number>()
  });

  // Brand colors - A-Frame Painting theme
  const brandColors = {
    primary: '#EA580C',        // Burnt orange (A-Frame brand color)
    secondary: '#DC2626',      // Red accent
    accent: '#10b981',         // Green for success/send buttons
    danger: '#ef4444',         // Red for delete actions
    background: '#0f172a',     // Dark navy background
    text: '#f1f5f9',          // Light text
    textLight: '#94a3b8'      // Muted text
  };

  // Dark mode colors for the app interface - black enough to hide logo borders
  const darkTheme = {
    background: '#000000',     // Pure black for seamless logo integration
    cardBg: '#0f0f0f',        // Very dark gray
    headerBg: '#1a1a1a',      // Dark header
    text: '#f1f5f9',          // Light text
    textSecondary: '#94a3b8',  // Muted text
    border: '#333333',        // Dark borders
    inputBg: '#1a1a1a',       // Dark input background
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
        { description: '', hours: 0, unitPrice: 60, detail: '', total: 0 }
      ]
    });
  };

  const removeLineItem = (index: number) => {
    const newLineItems = invoiceData.lineItems.filter((_, i) => i !== index);
    setInvoiceData({ ...invoiceData, lineItems: newLineItems });
  };

  const calculateSubtotal = () => {
    // Calculate labor total from daily hours
    const laborTotal = dailyHours.reduce((sum, hourEntry) => sum + (hourEntry.hours * (project.hourlyRate || 60)), 0);
    // Calculate materials total from selected receipts
    const selectedReceiptsTotal = receipts
      .filter(receipt => invoiceData.selectedReceipts.has(receipt.id))
      .reduce((sum, receipt) => sum + parseFloat(receipt.amount), 0);
    return laborTotal + invoiceData.suppliesCost + selectedReceiptsTotal;
  };

  const calculateGST = () => {
    // Only apply GST to labor and supplies, not to materials (receipts already include taxes)
    const laborTotal = dailyHours.reduce((sum, hourEntry) => sum + (hourEntry.hours * (project.hourlyRate || 60)), 0);
    return (laborTotal + invoiceData.suppliesCost) * invoiceData.gstRate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const generatePDF = async () => {
    if (!invoiceRef.current) {
      toast({
        title: "Error",
        description: "Invoice preview not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Generating PDF",
      description: "Creating your invoice PDF...",
    });

    try {
      // Temporarily show the invoice preview element for capture
      const originalDisplay = invoiceRef.current.style.display;
      const originalVisibility = invoiceRef.current.style.visibility;
      
      invoiceRef.current.style.display = 'block';
      invoiceRef.current.style.visibility = 'visible';
      invoiceRef.current.style.position = 'absolute';
      invoiceRef.current.style.top = '-9999px';
      invoiceRef.current.style.left = '-9999px';
      invoiceRef.current.style.width = '794px'; // A4 width in pixels
      
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the invoice preview
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 794,
        height: invoiceRef.current.scrollHeight
      });

      // Restore original styling
      invoiceRef.current.style.display = originalDisplay;
      invoiceRef.current.style.visibility = originalVisibility;
      invoiceRef.current.style.position = '';
      invoiceRef.current.style.top = '';
      invoiceRef.current.style.left = '';
      invoiceRef.current.style.width = '';

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit page
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Add main invoice page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);

      // Add selected receipt attachments (only image files, not PDFs)
      if (invoiceData.selectedReceipts.size > 0) {
        const selectedReceiptsArray = Array.from(invoiceData.selectedReceipts);
        for (const receiptId of selectedReceiptsArray) {
          const receipt = receipts.find(r => r.id === receiptId);
          if (receipt?.filename) {
            // Check if it's an image file that we can embed
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            const isImage = imageExtensions.some(ext => 
              receipt.filename.toLowerCase().includes(ext) || 
              (receipt.originalName && receipt.originalName.toLowerCase().endsWith(ext))
            );

            if (isImage) {
              try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                await new Promise((resolve, reject) => {
                  img.onload = resolve;
                  img.onerror = reject;
                  img.src = `/uploads/${receipt.filename}`;
                });

                pdf.addPage();
                const receiptRatio = Math.min(pdfWidth / img.width, pdfHeight / img.height);
                const receiptX = (pdfWidth - img.width * receiptRatio) / 2;
                const receiptY = (pdfHeight - img.height * receiptRatio) / 2;
                
                pdf.addImage(img, 'JPEG', receiptX, receiptY, img.width * receiptRatio, img.height * receiptRatio);
              } catch (error) {
                console.error('Error adding receipt image:', error);
                toast({
                  title: "Receipt Warning",
                  description: `Could not attach receipt image: ${receipt.originalName || receipt.filename}`,
                  variant: "destructive",
                });
              }
            } else {
              // For PDFs and other files, we can't embed them in the PDF
              console.log(`Skipping non-image receipt: ${receipt.originalName || receipt.filename}`);
            }
          }
        }
      }

      const filename = `Invoice-${invoiceData.invoiceNumber}-${project.clientName || 'Client'}.pdf`;
      pdf.save(filename);
      
      toast({
        title: "PDF Generated!",
        description: `Invoice downloaded as ${filename}`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendInvoice = () => {
    if (!invoiceData.clientEmail) {
      toast({
        title: "No Email Address",
        description: "Please add client email to send invoice",
        variant: "destructive",
      });
      return;
    }

    const subject = `Invoice #${invoiceData.invoiceNumber} - ${invoiceData.businessName}`;
    // Check if any receipts are selected for attachment
    const hasReceiptAttachments = invoiceData.selectedReceipts.size > 0;
    const receiptAttachmentNote = hasReceiptAttachments 
      ? "\n\nNote: Additional receipt files may be attached separately for your records."
      : "";

    const body = `Dear ${invoiceData.clientName},

${invoiceData.emailMessage}${receiptAttachmentNote}

Payment Instructions:
${invoiceData.notes}

Thank you for your business!

Best regards,
${invoiceData.businessName}`;

    // Create mailto URL and open in new window/tab
    const mailtoUrl = `mailto:${invoiceData.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Try multiple methods for better compatibility
    try {
      window.open(mailtoUrl);
    } catch (error) {
      // Fallback to location.href
      window.location.href = mailtoUrl;
    }
    
    const attachmentInstructions = hasReceiptAttachments 
      ? "Download the PDF invoice first, then manually attach any receipt files from your Files section to the email."
      : "Download the PDF invoice first, then attach it to your email.";

    toast({
      title: "Email Client Opened",
      description: attachmentInstructions,
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0" style={{ backgroundColor: darkTheme.background }}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-center p-6 border-b" style={{ backgroundColor: darkTheme.headerBg, borderColor: darkTheme.border }}>
            <div className="text-center">
              <h1 className="text-2xl font-bold" style={{ color: darkTheme.text }}>Invoice Generator</h1>
              <p style={{ color: darkTheme.textSecondary }}>Professional painting services</p>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-6" style={{ backgroundColor: darkTheme.background }}>
            {/* Business & Invoice Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center" style={{ color: darkTheme.text }}>
                  <User className="mr-2 h-5 w-5" />
                  Business Information
                </h2>
                <div className="space-y-2">
                  <Input
                    value={invoiceData.businessName}
                    onChange={(e) => setInvoiceData({...invoiceData, businessName: e.target.value})}
                    className="bg-gray-900 border-gray-700 text-white"
                    placeholder="Business Name"
                  />
                  <Input
                    value={invoiceData.businessAddress}
                    onChange={(e) => setInvoiceData({...invoiceData, businessAddress: e.target.value})}
                    className="bg-gray-900 border-gray-700 text-white"
                    placeholder="Address"
                  />
                  <Input
                    value={invoiceData.businessEmail}
                    onChange={(e) => setInvoiceData({...invoiceData, businessEmail: e.target.value})}
                    className="bg-gray-900 border-gray-700 text-white"
                    placeholder="Email"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center" style={{ color: darkTheme.text }}>
                  <Calendar className="mr-2 h-5 w-5" />
                  Invoice Details
                </h2>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: darkTheme.textSecondary }}>Invoice Number</label>
                    <Input
                      type="number"
                      value={invoiceData.invoiceNumber}
                      onChange={(e) => setInvoiceData({...invoiceData, invoiceNumber: parseInt(e.target.value)})}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: darkTheme.textSecondary }}>Date</label>
                    <Input
                      type="date"
                      value={invoiceData.date}
                      onChange={(e) => setInvoiceData({...invoiceData, date: e.target.value})}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: darkTheme.textSecondary }}>Additional Supplies Cost</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={invoiceData.suppliesCost}
                      onChange={(e) => setInvoiceData({...invoiceData, suppliesCost: parseFloat(e.target.value) || 0})}
                      className="bg-gray-900 border-gray-700 text-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center" style={{ color: darkTheme.text }}>
                <MapPin className="mr-2 h-5 w-5" />
                Client Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  value={invoiceData.clientName}
                  onChange={(e) => setInvoiceData({...invoiceData, clientName: e.target.value})}
                  className="bg-gray-900 border-gray-700 text-white"
                  placeholder="Client Name"
                />
                <Input
                  type="email"
                  value={invoiceData.clientEmail}
                  onChange={(e) => setInvoiceData({...invoiceData, clientEmail: e.target.value})}
                  className="bg-gray-900 border-gray-700 text-white"
                  placeholder="Client Email"
                />
                <Input
                  value={invoiceData.clientAddress}
                  onChange={(e) => setInvoiceData({...invoiceData, clientAddress: e.target.value})}
                  className="bg-gray-900 border-gray-700 text-white"
                  placeholder="Client Address"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={invoiceData.clientCity}
                    onChange={(e) => setInvoiceData({...invoiceData, clientCity: e.target.value})}
                    className="bg-gray-900 border-gray-700 text-white"
                    placeholder="City, Province"
                  />
                  <Input
                    value={invoiceData.clientPostal}
                    onChange={(e) => setInvoiceData({...invoiceData, clientPostal: e.target.value})}
                    className="bg-gray-900 border-gray-700 text-white"
                    placeholder="Postal Code"
                  />
                </div>
              </div>
            </div>

            {/* Email Message */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center" style={{ color: darkTheme.text }}>
                <Send className="mr-2 h-5 w-5" />
                Email Message
              </h2>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: darkTheme.textSecondary }}>
                  Custom message for email body
                </label>
                <Textarea
                  value={invoiceData.emailMessage}
                  onChange={(e) => setInvoiceData({...invoiceData, emailMessage: e.target.value})}
                  className="bg-gray-900 border-gray-700 text-white min-h-20"
                  placeholder="Enter your custom message..."
                />
              </div>
            </div>

            {/* Services & Labor - Daily Hours Layout */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold" style={{ color: darkTheme.text }}>Services & Labor</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ borderColor: darkTheme.border }}>
                  <thead>
                    <tr style={{ backgroundColor: darkTheme.inputBg }}>
                      <th className="border p-3 text-left" style={{ borderColor: darkTheme.border, color: darkTheme.text }}>Date</th>
                      <th className="border p-3 text-left" style={{ borderColor: darkTheme.border, color: darkTheme.text }}>Description</th>
                      <th className="border p-3 text-center" style={{ borderColor: darkTheme.border, color: darkTheme.text }}>Hours</th>
                      <th className="border p-3 text-right" style={{ borderColor: darkTheme.border, color: darkTheme.text }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyHours.map((hourEntry, index) => (
                      <tr key={index}>
                        <td className="border p-3" style={{ borderColor: darkTheme.border, color: darkTheme.text }}>
                          {(() => {
                            // Parse date string directly to avoid timezone conversion
                            const dateStr = hourEntry.date.toString();
                            const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
                            const [year, month, day] = datePart.split('-').map(Number);
                            const localDate = new Date(year, month - 1, day);
                            return localDate.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            });
                          })()}
                        </td>
                        <td className="border p-3" style={{ borderColor: darkTheme.border, color: darkTheme.text }}>
                          {hourEntry.description || 'Painting'}
                        </td>
                        <td className="border p-3 text-center" style={{ borderColor: darkTheme.border, color: darkTheme.text }}>
                          {hourEntry.hours}
                        </td>
                        <td className="border p-3 text-right font-semibold" style={{ borderColor: darkTheme.border, color: darkTheme.text }}>
                          ${(hourEntry.hours * (project.hourlyRate || 60)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Receipt Attachment Option */}
            {receipts.length > 0 && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: darkTheme.cardBg }}>
                <h3 className="text-sm font-medium mb-3" style={{ color: darkTheme.text }}>Receipts & Materials</h3>
                
                {/* Display receipt items */}
                <div className="space-y-2 mb-4">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="flex justify-between items-center text-sm">
                      <span style={{ color: darkTheme.text }}>{receipt.vendor}</span>
                      <span style={{ color: darkTheme.text }}>${receipt.amount}</span>
                    </div>
                  ))}
                </div>
                
                {/* Single checkbox for all receipts */}
                <label className="flex items-center space-x-2 text-sm border-t pt-3" style={{ borderColor: darkTheme.border }}>
                  <input
                    type="checkbox"
                    checked={receipts.length > 0 && receipts.every(r => invoiceData.selectedReceipts.has(r.id))}
                    onChange={(e) => {
                      const newSelection = new Set<number>();
                      if (e.target.checked) {
                        receipts.forEach(receipt => newSelection.add(receipt.id));
                      }
                      setInvoiceData({...invoiceData, selectedReceipts: newSelection});
                    }}
                    className="rounded"
                  />
                  <span style={{ color: darkTheme.text }}>
                    Include receipt images in PDF (separate from house photos)
                  </span>
                </label>
              </div>
            )}

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between py-2 border-b" style={{ borderColor: darkTheme.border }}>
                  <span className="font-medium" style={{ color: darkTheme.text }}>Labor:</span>
                  <span className="font-semibold" style={{ color: darkTheme.text }}>${dailyHours.reduce((sum, hourEntry) => sum + (hourEntry.hours * (project.hourlyRate || 60)), 0).toFixed(2)}</span>
                </div>
                {invoiceData.suppliesCost > 0 && (
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: darkTheme.border }}>
                    <span className="font-medium" style={{ color: darkTheme.text }}>Additional Supplies:</span>
                    <span className="font-semibold" style={{ color: darkTheme.text }}>${invoiceData.suppliesCost.toFixed(2)}</span>
                  </div>
                )}
                {receipts.filter(receipt => invoiceData.selectedReceipts.has(receipt.id)).length > 0 && (
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: darkTheme.border }}>
                    <span className="font-medium" style={{ color: darkTheme.text }}>Materials (incl. taxes):</span>
                    <span className="font-semibold" style={{ color: darkTheme.text }}>${receipts.filter(receipt => invoiceData.selectedReceipts.has(receipt.id)).reduce((sum, receipt) => sum + parseFloat(receipt.amount), 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b" style={{ borderColor: darkTheme.border }}>
                  <span className="font-medium" style={{ color: darkTheme.text }}>Subtotal:</span>
                  <span className="font-semibold" style={{ color: darkTheme.text }}>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b" style={{ borderColor: darkTheme.border }}>
                  <span className="font-medium" style={{ color: darkTheme.text }}>GST (5%):</span>
                  <span className="font-semibold" style={{ color: darkTheme.text }}>${calculateGST().toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-2 text-lg font-bold px-4 rounded" style={{ backgroundColor: `${brandColors.primary}20`, color: darkTheme.text }}>
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: darkTheme.textSecondary }}>Notes & Payment Instructions</label>
              <Textarea
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                className="bg-gray-900 border-gray-700 text-white"
                rows={3}
                placeholder="Payment instructions, additional notes, etc."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 pt-6 border-t" style={{ borderColor: darkTheme.border }}>
              <Button
                onClick={generatePDF}
                className="text-white hover:opacity-90"
                style={{ backgroundColor: brandColors.primary }}
              >
                <Download className="mr-2 h-5 w-5" />
                Download PDF
              </Button>
              <Button
                onClick={sendInvoice}
                disabled={!invoiceData.clientEmail}
                className="text-white hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed"
                style={{ backgroundColor: invoiceData.clientEmail ? '#1E40AF' : '#9ca3af' }}
              >
                <Send className="mr-2 h-5 w-5" />
                Send Invoice
              </Button>
            </div>
          </div>
        </div>

        {/* Invoice Preview (for PDF generation) */}
        <div ref={invoiceRef} className="hidden print:block print:max-w-none" style={{ backgroundColor: '#000000', color: '#fff' }}>
          <div className="p-8">
            {/* Header Section */}
            <div className="mb-8">
              {/* Logo Only */}
              <div className="flex justify-center">
                <img 
                  src={invoiceData.businessLogo} 
                  alt="A-Frame Painting Logo" 
                  className="h-24 w-auto"
                />
              </div>
            </div>

            {/* Invoice Title and Info */}
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-600">
              <div>
                <h2 className="text-4xl font-bold" style={{ color: brandColors.primary }}>Invoice</h2>
                <p className="text-gray-400 mt-1">Professional Painting Services</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-300">
                  <p><span className="text-gray-500">Invoice #:</span> <span className="font-semibold">#{invoiceData.invoiceNumber}</span></p>
                  <p><span className="text-gray-500">Date:</span> <span className="font-semibold">{invoiceData.date}</span></p>
                </div>
              </div>
            </div>

            {/* Client Info */}
            <div className="mb-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Bill To</h3>
                  <div className="text-white">
                    <p className="font-semibold text-lg">{invoiceData.clientName}</p>
                    <p className="text-gray-300">{invoiceData.clientAddress}</p>
                    <p className="text-gray-300">{invoiceData.clientCity} {invoiceData.clientPostal}</p>
                    {invoiceData.clientPhone && <p className="text-gray-300">{invoiceData.clientPhone}</p>}
                    {invoiceData.clientEmail && <p className="text-gray-300">{invoiceData.clientEmail}</p>}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">From</h3>
                  <div className="text-white">
                    <p className="font-semibold text-lg">{invoiceData.businessName}</p>
                    <p className="text-gray-300">{invoiceData.businessAddress}</p>
                    <p className="text-gray-300">{invoiceData.businessCity}</p>
                    <p className="text-gray-300">{invoiceData.businessEmail}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Hours - Detailed Work Description */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Daily Work Log</h3>
              <div className="overflow-hidden rounded-lg border border-gray-600">
                <table className="w-full">
                  <thead style={{ backgroundColor: '#2d3748' }}>
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">Hours</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Work Description</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyHours.map((hourEntry, index) => (
                      <tr key={index} className={index % 2 === 0 ? '' : 'bg-gray-800'}>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: brandColors.accent }}></div>
                            <span className="font-medium text-white">
                              {(() => {
                              // Parse date string directly to avoid timezone conversion
                              const dateStr = hourEntry.date.toString();
                              const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
                              const [year, month, day] = datePart.split('-').map(Number);
                              const localDate = new Date(year, month - 1, day);
                              return localDate.toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              });
                            })()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-300">{hourEntry.hours}hr</td>
                        <td className="px-6 py-4 text-gray-300">
                          {hourEntry.description || 'Painting'}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-white">
                          ${(hourEntry.hours * (project.hourlyRate || 60)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Materials from receipts */}
                    {receipts.filter(receipt => invoiceData.selectedReceipts.has(receipt.id)).length > 0 && (
                      <tr>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: brandColors.primary }}></div>
                            <span className="font-medium text-white">Materials (incl. taxes)</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-300">-</td>
                        <td className="px-6 py-4 text-gray-300">
                          {receipts.filter(receipt => invoiceData.selectedReceipts.has(receipt.id))
                            .map(receipt => receipt.vendor).join(', ')}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-white">
                          ${receipts.filter(receipt => invoiceData.selectedReceipts.has(receipt.id))
                            .reduce((sum, receipt) => sum + parseFloat(receipt.amount), 0).toFixed(2)}
                        </td>
                      </tr>
                    )}

                    {/* Additional supplies */}
                    {invoiceData.suppliesCost > 0 && (
                      <tr>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: brandColors.primary }}></div>
                            <span className="font-medium text-white">Additional Supplies</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-300">-</td>
                        <td className="px-6 py-4 text-gray-300">Additional materials and supplies</td>
                        <td className="px-6 py-4 text-right font-semibold text-white">${invoiceData.suppliesCost.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-8">
              <div className="w-80">
                <div className="p-6 rounded-lg" style={{ backgroundColor: '#2d3748' }}>
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-300">
                      <span>Subtotal</span>
                      <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>GST (5%)</span>
                      <span className="font-semibold">${calculateGST().toFixed(2)}</span>
                    </div>

                    <div className="border-t border-gray-600 pt-3">
                      <div className="flex justify-center">
                        <div className="px-6 py-3 rounded-lg text-center text-xl font-bold text-white" style={{ backgroundColor: '#059669', minWidth: '200px' }}>
                          Total: ${calculateTotal().toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method and Notes */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment Method</h3>
                <div className="p-4 rounded-lg border border-gray-600" style={{ backgroundColor: '#2d3748' }}>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: brandColors.accent }}></div>
                    <span className="text-white font-medium">E-Transfer</span>
                  </div>
                  <p className="text-gray-300 text-sm mt-2">Send payment to: {invoiceData.businessEmail}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Notes</h3>
                <div className="p-4 rounded-lg border border-gray-600" style={{ backgroundColor: '#2d3748' }}>
                  <p className="text-gray-300 text-sm">{invoiceData.notes}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-6 border-t border-gray-600">
              <div className="flex items-center justify-center mb-4">
                <div className="w-8 h-1 rounded mr-2" style={{ backgroundColor: brandColors.primary }}></div>
                <span className="text-lg font-bold text-white">Thank You For Your Business!</span>
                <div className="w-8 h-1 rounded ml-2" style={{ backgroundColor: brandColors.primary }}></div>
              </div>
              <p className="text-gray-400 text-sm">
                For questions about this invoice, please contact {invoiceData.businessEmail}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}