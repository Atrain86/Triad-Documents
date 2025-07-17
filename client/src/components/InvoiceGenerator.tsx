import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Calendar, Download, Send, Plus, Trash2, User, MapPin, Phone, Mail, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  const [isSending, setIsSending] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
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
      description: hour.description || 'Painting',
      hours: hour.hours,
      unitPrice: hour.hourlyRate || 60,
      detail: `Date: ${new Date(hour.date).toLocaleDateString()}`,
      total: hour.hours * (hour.hourlyRate || 60)
    })) : [{
      description: 'Painting',
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

  // Paint Brain colors for invoice generator
  const paintBrainColors = {
    green: '#6A9955',         // Paint Brain green for headers and buttons
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
    accent: paintBrainColors.accent
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
              receipt.filename!.toLowerCase().includes(ext) || 
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

  const generatePDFBlob = async (): Promise<Blob | null> => {
    if (!invoiceRef.current) {
      return null;
    }

    let originalOpacity = '';
    let originalPointerEvents = '';
    let originalPosition = '';
    let originalTop = '';
    let originalLeft = '';
    
    try {
      // Temporarily make the element visible for PDF generation
      originalOpacity = invoiceRef.current.style.opacity;
      originalPointerEvents = invoiceRef.current.style.pointerEvents;
      originalPosition = invoiceRef.current.style.position;
      originalTop = invoiceRef.current.style.top;
      originalLeft = invoiceRef.current.style.left;
      
      invoiceRef.current.style.opacity = '1';
      invoiceRef.current.style.pointerEvents = 'auto';
      invoiceRef.current.style.position = 'fixed';
      invoiceRef.current.style.top = '0';
      invoiceRef.current.style.left = '0';
      invoiceRef.current.style.zIndex = '9999';
      invoiceRef.current.style.width = '794px';
      invoiceRef.current.style.transform = 'none';
      
      // Wait for rendering and images to load - longer wait for better stability
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if element is properly rendered
      if (!invoiceRef.current || invoiceRef.current.scrollHeight === 0) {
        // Restore original styles before throwing error
        invoiceRef.current.style.opacity = originalOpacity;
        invoiceRef.current.style.pointerEvents = originalPointerEvents;
        throw new Error('Invoice preview not properly rendered');
      }

      // Get the actual full height of the element including all content
      // Add extra padding to accommodate varying amounts of daily hours and receipts
      const baseHeight = Math.max(
        invoiceRef.current.scrollHeight,
        invoiceRef.current.offsetHeight,
        invoiceRef.current.clientHeight,
        1600 // Minimum height
      );
      
      // Add massive dynamic padding to ensure payment method and notes are never truncated
      const contentPadding = Math.max(800, dailyHours.length * 80 + 400);
      const fullHeight = baseHeight + contentPadding;
      
      // Capture the invoice preview with optimized settings for smaller file size
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 1, // Reduced from 2 to 1 for smaller file size
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 794,
        height: fullHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        windowHeight: fullHeight,
        onclone: (clonedDoc) => {
          // Ensure all images are loaded and visible in the cloned document
          const images = clonedDoc.querySelectorAll('img');
          images.forEach(img => {
            const htmlImg = img as HTMLImageElement;
            if (htmlImg.src) {
              htmlImg.style.display = 'block';
              htmlImg.style.opacity = '1';
              htmlImg.style.visibility = 'visible';
            }
          });
        }
      });

      // Validate canvas dimensions
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas has invalid dimensions');
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit page
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Convert canvas to JPEG with quality setting for smaller file size
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      if (!imageData || imageData === 'data:,' || imageData.length < 100) {
        throw new Error('Failed to generate valid image data from canvas');
      }
      
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
      console.log('Image data length:', imageData.length);

      // Add main invoice page
      pdf.addImage(imageData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      // Log PDF info for debugging
      console.log('PDF pages:', pdf.getNumberOfPages());
      console.log('PDF size estimate:', pdf.output('blob').size, 'bytes');

      // Receipts are now sent as separate email attachments only (not embedded in PDF)

      // Restore original styles
      invoiceRef.current.style.opacity = originalOpacity;
      invoiceRef.current.style.pointerEvents = originalPointerEvents;
      invoiceRef.current.style.position = originalPosition;
      invoiceRef.current.style.top = originalTop;
      invoiceRef.current.style.left = originalLeft;
      invoiceRef.current.style.zIndex = '';

      // Return PDF as blob instead of downloading
      return pdf.output('blob');
    } catch (error) {
      console.error('Error generating PDF blob:', error);
      
      // Restore original styles even if error occurs
      if (invoiceRef.current) {
        invoiceRef.current.style.opacity = originalOpacity || '';
        invoiceRef.current.style.pointerEvents = originalPointerEvents || '';
        invoiceRef.current.style.position = originalPosition || '';
        invoiceRef.current.style.top = originalTop || '';
        invoiceRef.current.style.left = originalLeft || '';
        invoiceRef.current.style.zIndex = '';
      }
      
      return null;
    }
  };

  const sendInvoice = async () => {
    if (!invoiceData.clientEmail) {
      toast({
        title: "No Email Address",
        description: "Please add client email to send invoice",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    const subject = `Invoice #${invoiceData.invoiceNumber} - ${invoiceData.businessName}`;
    
    const textBody = `Dear ${invoiceData.clientName},

${invoiceData.emailMessage}

Payment Instructions:
${invoiceData.notes}

Thank you for your business!

Best regards,
${invoiceData.businessName}
cortespainter@gmail.com
884 Hayes Rd, Manson's Landing, BC V0P1K0`;

    try {
      // Show loading state
      toast({
        title: "Preparing Email",
        description: "Generating PDF and preparing email...",
      });

      // Generate PDF first and get it as base64
      const pdfBlob = await generatePDFBlob();
      
      if (pdfBlob) {
        // Convert to base64 for potential server sending
        const reader = new FileReader();
        reader.onloadend = async () => {
          const pdfBase64 = reader.result?.toString().split(',')[1];
          const pdfFilename = `Invoice-${invoiceData.invoiceNumber}-${invoiceData.clientName.replace(/\s+/g, '-')}.pdf`;
          
          // Collect selected receipt filenames for email attachments
          const selectedReceiptFilenames = [];
          if (invoiceData.selectedReceipts.size > 0) {
            const selectedReceiptsArray = Array.from(invoiceData.selectedReceipts);
            for (const receiptId of selectedReceiptsArray) {
              const receipt = receipts.find(r => r.id === receiptId);
              if (receipt?.filename) {
                selectedReceiptFilenames.push(receipt.filename);
              }
            }
          }

          // Try the new nodemailer Gmail endpoint first
          try {
            const response = await fetch('/api/send-invoice-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipientEmail: invoiceData.clientEmail,
                clientName: invoiceData.clientName,
                invoiceNumber: invoiceData.invoiceNumber,
                pdfData: pdfBase64,
                receiptFilenames: selectedReceiptFilenames
              })
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
              // Show immediate toast feedback
              toast({
                title: "✅ Email Sent Successfully!",
                description: `Invoice #${invoiceData.invoiceNumber} sent to ${invoiceData.clientEmail}`,
                duration: 5000,
              });
              
              // Also show success dialog
              setSuccessMessage(`Invoice #${invoiceData.invoiceNumber} sent successfully to ${invoiceData.clientEmail} with PDF attachment!`);
              setShowSuccessDialog(true);
              
              // Close the main dialog after showing success
              setTimeout(() => onClose(), 2000);
            } else {
              throw new Error(result.error || 'Failed to send email via nodemailer');
            }
            
          } catch (emailError) {
            console.error('Email preparation failed:', emailError);
            
            // Final fallback - just download PDF and copy email content
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = pdfFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            try {
              await navigator.clipboard.writeText(`To: ${invoiceData.clientEmail}\nSubject: ${subject}\n\n${textBody}`);
            } catch (clipboardError) {
              console.log('Clipboard access denied, skipping email content copy');
            }
            
            toast({
              title: "PDF Downloaded",
              description: "PDF downloaded and email content copied to clipboard. Please compose email manually.",
            });
          }
        };
        reader.readAsDataURL(pdfBlob);
      }

    } catch (error) {
      console.error('Email sending failed:', error);
      
      // Fallback to clipboard only
      const emailContent = `To: ${invoiceData.clientEmail}
Subject: ${subject}

${textBody}`;

      navigator.clipboard.writeText(emailContent).catch(() => {});
      
      toast({
        title: "Content Copied",
        description: "Invoice email copied to clipboard. Please paste into Gmail manually.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };



  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0" style={{ backgroundColor: darkTheme.background }}>
        <DialogHeader className="sr-only">
          <DialogTitle>Invoice Generator</DialogTitle>
          <DialogDescription>Create and send professional painting service invoices</DialogDescription>
        </DialogHeader>
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
                <h2 className="text-xl font-semibold flex items-center" style={{ color: paintBrainColors.green }}>
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
                <h2 className="text-xl font-semibold flex items-center" style={{ color: paintBrainColors.green }}>
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
                      min="0"
                      value={invoiceData.suppliesCost === 0 ? '' : invoiceData.suppliesCost}
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
              <h2 className="text-xl font-semibold flex items-center" style={{ color: paintBrainColors.green }}>
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
              <h2 className="text-xl font-semibold flex items-center" style={{ color: paintBrainColors.green }}>
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
              <h2 className="text-xl font-semibold" style={{ color: paintBrainColors.green }}>Services & Labor</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ borderColor: darkTheme.border }}>
                  <thead>
                    <tr style={{ backgroundColor: darkTheme.inputBg }}>
                      <th className="border p-3 text-left" style={{ borderColor: paintBrainColors.green, color: paintBrainColors.green }}>Date</th>
                      <th className="border p-3 text-left" style={{ borderColor: paintBrainColors.green, color: paintBrainColors.green }}>Description</th>
                      <th className="border p-3 text-center" style={{ borderColor: paintBrainColors.green, color: paintBrainColors.green }}>Hours</th>
                      <th className="border p-3 text-right" style={{ borderColor: paintBrainColors.green, color: paintBrainColors.green }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyHours.map((hourEntry, index) => (
                      <tr key={index}>
                        <td className="border p-3" style={{ borderColor: paintBrainColors.green, color: darkTheme.text }}>
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
                        <td className="border p-3" style={{ borderColor: paintBrainColors.green, color: darkTheme.text }}>
                          {hourEntry.description || 'Painting'}
                        </td>
                        <td className="border p-3 text-center" style={{ borderColor: paintBrainColors.green, color: darkTheme.text }}>
                          {hourEntry.hours}
                        </td>
                        <td className="border p-3 text-right font-semibold" style={{ borderColor: paintBrainColors.green, color: darkTheme.text }}>
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
                <h3 className="text-sm font-medium mb-3" style={{ color: paintBrainColors.green }}>Receipts & Materials</h3>
                
                {/* Display receipt items with OCR data */}
                <div className="space-y-3 mb-4">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="border rounded p-2" style={{ borderColor: darkTheme.border }}>
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span className="font-medium" style={{ color: darkTheme.text }}>{receipt.vendor}</span>
                        <span className="font-semibold" style={{ color: darkTheme.text }}>${receipt.amount}</span>
                      </div>
                      {receipt.items && receipt.items.length > 0 && (
                        <div className="text-xs space-y-1">
                          {receipt.items.map((item, index) => (
                            <div key={index} className="pl-2" style={{ color: darkTheme.textSecondary }}>
                              • {item}
                            </div>
                          ))}
                          {receipt.ocrMethod && (
                            <div className="text-xs mt-1 opacity-60" style={{ color: darkTheme.textSecondary }}>
                              Processed with {receipt.ocrMethod} ({Math.round((receipt.confidence || 0) * 100)}% confidence)
                            </div>
                          )}
                        </div>
                      )}
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
                    Include receipts as email attachments (not embedded in PDF)
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

                <div className="flex justify-between py-2 text-lg font-bold px-4 rounded" style={{ backgroundColor: `${paintBrainColors.primary}20`, color: darkTheme.text }}>
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
                style={{ backgroundColor: paintBrainColors.green }}
              >
                <Download className="mr-2 h-5 w-5" />
                Download PDF
              </Button>
              <Button
                onClick={sendInvoice}
                disabled={!invoiceData.clientEmail || isSending}
                className="text-white hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed"
                style={{ backgroundColor: (invoiceData.clientEmail && !isSending) ? paintBrainColors.green : '#9ca3af' }}
              >
                {isSending ? (
                  <>
                    <div className="mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Send Invoice
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Invoice Preview (for PDF generation) */}
        <div ref={invoiceRef} data-invoice-ref className="fixed -top-[9999px] -left-[9999px] w-[794px] opacity-0 pointer-events-none print:static print:opacity-100 print:pointer-events-auto print:block print:max-w-none" style={{ backgroundColor: '#000000', color: '#fff', minHeight: '1600px' }}>
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
                <h2 className="text-4xl font-bold" style={{ color: paintBrainColors.primary }}>Invoice</h2>
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
                      <th className="px-6 py-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-1 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">Hours</th>
                      <th className="px-6 py-1 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Work Description</th>
                      <th className="px-6 py-1 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyHours.map((hourEntry, index) => (
                      <tr key={index} className={index % 2 === 0 ? '' : 'bg-gray-800'}>
                        <td className="px-6 py-1">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: paintBrainColors.accent }}></div>
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
                        <td className="px-6 py-1 text-center text-gray-300">{hourEntry.hours}hr</td>
                        <td className="px-6 py-1 text-gray-300">
                          {hourEntry.description || 'Painting'}
                        </td>
                        <td className="px-6 py-1 text-right font-semibold text-white">
                          ${(hourEntry.hours * (project.hourlyRate || 60)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Supplies - simplified single line (receipt details in attachments) */}
                    {receipts.filter(receipt => invoiceData.selectedReceipts.has(receipt.id)).length > 0 && (
                      <tr>
                        <td className="px-6 py-3">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: paintBrainColors.primary }}></div>
                            <span className="font-medium text-white">Supplies</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center text-gray-300">-</td>
                        <td className="px-6 py-3 text-gray-300">Materials and supplies (see receipts)</td>
                        <td className="px-6 py-3 text-right font-semibold text-white">
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
                            <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: paintBrainColors.primary }}></div>
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


          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Success Dialog */}
    <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-green-600 flex items-center justify-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            Email Sent Successfully!
          </DialogTitle>
          <DialogDescription className="text-center pt-4 space-y-3">
            <div className="text-gray-700 font-medium">{successMessage}</div>
            <div className="text-sm text-gray-500 space-y-1">
              <div>✓ PDF invoice attached</div>
              <div>✓ Email delivered successfully</div>
              <div>✓ Check your sent folder for confirmation</div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Button 
            onClick={() => setShowSuccessDialog(false)}
            className="bg-green-600 hover:bg-green-700 text-white px-8"
          >
            Great!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}