import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Calendar, Download, Send, Plus, Trash2, User, MapPin, Phone, Mail, X, Wrench, Users, ChevronDown, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  const { user } = useAuth();

  // Get documents logo (unified for estimates and invoices)
  const { data: documentsLogo } = useQuery({
    queryKey: [`/api/users/1/logos/documents`],
    select: (data: any) => data?.logo || null
  });

  // Fallback to regular logo if no documents-specific logo is set
  const { data: fallbackLogo } = useQuery({
    queryKey: [`/api/users/1/logo`],
    select: (data: any) => data?.logo || null,
    enabled: !documentsLogo
  });

  const currentLogo = documentsLogo || fallbackLogo;

  // Logo visibility settings
  const [logoVisibility, setLogoVisibility] = useState(() => {
    const saved = localStorage.getItem('logoVisibility');
    return saved ? JSON.parse(saved) : {
      homepage: true,
      estimates: true,
      emails: true
    };
  });

  const [isSending, setIsSending] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [emailMessage, setEmailMessage] = useState('');
  const [actionMode, setActionMode] = useState<'download' | 'email'>('email');
  const [emailSaveStatus, setEmailSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [emailInitialized, setEmailInitialized] = useState(false);
  const [userHasEdited, setUserHasEdited] = useState(false);
  
  // Material markup state for invoice
  const [materialMarkupEnabled, setMaterialMarkupEnabled] = useState(false);
  const [materialMarkupPercentage, setMaterialMarkupPercentage] = useState('');
  
  // Dropdown states for containers
  const [showClientInfo, setShowClientInfo] = useState(true);
  const [showServicesLabor, setShowServicesLabor] = useState(true);
  const [showMaterials, setShowMaterials] = useState(true);
  const [showTotals, setShowTotals] = useState(true);
  
  // Ref for the first input to prevent auto-selection
  const firstInputRef = React.useRef<HTMLInputElement>(null);
  
  // Save custom email message to localStorage
  const saveEmailMessage = (message: string) => {
    try {
      localStorage.setItem('customEmailTemplate', message);
      console.log('Email template saved to localStorage:', message.substring(0, 50) + '...');
    } catch (error) {
      console.error('Failed to save email template:', error);
    }
  };

  // Load saved email message from localStorage
  const loadSavedEmailMessage = (): string => {
    try {
      const saved = localStorage.getItem('customEmailTemplate');
      console.log('Loading saved template from localStorage:', saved ? saved.substring(0, 50) + '... (length: ' + saved.length + ')' : 'No saved template');
      return saved || '';
    } catch (error) {
      console.error('Failed to load email template:', error);
      return '';
    }
  };
  
  // Initialize email message with saved template or default
  React.useEffect(() => {
    const firstName = (invoiceData.clientName || project.clientName).split(' ')[0];
    const savedTemplate = loadSavedEmailMessage();
    
    let finalMessage = '';
    if (savedTemplate) {
      // Use saved template, but update client name dynamically
      finalMessage = savedTemplate.replace(/Hi \w+,/, `Hi ${firstName},`);
    } else {
      // Create default message
      finalMessage = `Hi ${firstName},

Please find attached your invoice for painting services.

Payment Instructions:
Please send e-transfer to cortespainter@gmail.com

Thank you for your business!

Best regards,
A-Frame Painting
cortespainter@gmail.com`;
    }
    
    setEmailMessage(finalMessage);
    setUserHasEdited(false); // Reset user edit flag
    // Mark as initialized after message is set - longer delay to prevent auto-save on load
    setTimeout(() => {
      console.log('Marking email as initialized - auto-save now enabled');
      setEmailInitialized(true);
    }, 500);
  }, [project.clientName]);

  // Auto-save email message changes with debouncing - only after user edits
  React.useEffect(() => {
    console.log('Auto-save effect triggered:', { 
      emailMessage: emailMessage?.substring(0, 30), 
      emailInitialized,
      messageLength: emailMessage?.length,
      isOpen,
      userHasEdited
    });
    
    // Only auto-save if:
    // 1. Dialog is open
    // 2. Email message exists
    // 3. System is initialized
    // 4. User has actually made an edit (not just initial load)
    if (isOpen && emailMessage && emailInitialized && userHasEdited) {
      console.log('Setting save status to saving...');
      setEmailSaveStatus('saving');
      const timeoutId = setTimeout(() => {
        try {
          console.log('Attempting to save email message...');
          saveEmailMessage(emailMessage);
          setEmailSaveStatus('saved');
          console.log('Email save status set to saved');
          // Reset to idle after showing saved status briefly
          setTimeout(() => {
            console.log('Setting save status back to idle');
            setEmailSaveStatus('idle');
          }, 3000);
        } catch (error) {
          console.error('Save failed:', error);
          setEmailSaveStatus('idle');
        }
      }, 1000); // Save after 1 second of no changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [emailMessage, emailInitialized, isOpen, userHasEdited]);

  // Reset email message to default
  const resetEmailToDefault = () => {
    const firstName = (invoiceData.clientName || project.clientName).split(' ')[0];
    const defaultMessage = `Hi ${firstName},

Please find attached your invoice for painting services.

Payment Instructions:
Please send e-transfer to cortespainter@gmail.com

Thank you for your business!

Best regards,
A-Frame Painting
cortespainter@gmail.com`;
    
    setEmailMessage(defaultMessage);
    localStorage.removeItem('customEmailTemplate');
    setEmailSaveStatus('saved');
    setTimeout(() => setEmailSaveStatus('idle'), 2000);
    
    toast({
      title: "Email Template Reset",
      description: "Email message restored to default template",
      duration: 3000,
    });
  };

  // Listen for logo visibility changes
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      const saved = localStorage.getItem('logoVisibility');
      if (saved) {
        setLogoVisibility(JSON.parse(saved));
      }
    };

    window.addEventListener('storage', handleVisibilityChange);
    return () => window.removeEventListener('storage', handleVisibilityChange);
  }, []);

  // Prevent text auto-selection when dialog opens and refresh invoice number
  React.useEffect(() => {
    if (isOpen) {
      // If localStorage is empty, set a default starting value
      if (!localStorage.getItem('nextInvoiceNumber')) {
        localStorage.setItem('nextInvoiceNumber', '346');
        console.log('Set default invoice number to 346');
      }
      
      // Force fresh read from localStorage and update invoice number
      const freshInvoiceNumber = parseInt(localStorage.getItem('nextInvoiceNumber') || '346');
      console.log('Invoice Generator opened - localStorage value:', localStorage.getItem('nextInvoiceNumber'));
      console.log('Parsed invoice number:', freshInvoiceNumber);
      
      setInvoiceData(prev => ({
        ...prev,
        invoiceNumber: freshInvoiceNumber
      }));
      
      // Immediate prevention without delay
      if (firstInputRef.current) {
        firstInputRef.current.setSelectionRange(0, 0);
        firstInputRef.current.blur();
      }
      
      // Also use requestAnimationFrame for immediate DOM update
      requestAnimationFrame(() => {
        if (firstInputRef.current) {
          firstInputRef.current.setSelectionRange(0, 0);
          firstInputRef.current.blur();
        }
      });
    }
  }, [isOpen]);


  
  // Get next invoice number from localStorage
  const getNextInvoiceNumber = () => {
    const nextNumber = parseInt(localStorage.getItem('nextInvoiceNumber') || '1');
    return nextNumber;
  };

  // Increment and save next invoice number, update display
  const incrementInvoiceNumber = () => {
    console.log('CRITICAL: incrementInvoiceNumber function called');
    const currentDisplayedNumber = invoiceData.invoiceNumber; // Use displayed number
    console.log('Current displayed invoice number:', currentDisplayedNumber);
    const nextNumber = currentDisplayedNumber + 1;
    console.log('Setting next invoice number to:', nextNumber);
    
    // Update localStorage and state immediately
    localStorage.setItem('nextInvoiceNumber', nextNumber.toString());
    console.log('CRITICAL: localStorage updated to:', localStorage.getItem('nextInvoiceNumber'));
    
    // Update the displayed invoice number for next time
    setInvoiceData(prev => ({
      ...prev,
      invoiceNumber: nextNumber
    }));
    
    console.log('CRITICAL: Invoice number incremented from', currentDisplayedNumber, 'to', nextNumber);
    return currentDisplayedNumber; // Return the number that was just used
  };



  const [invoiceData, setInvoiceData] = useState(() => {
    return {
      invoiceNumber: getNextInvoiceNumber(),
      date: new Date().toISOString().split('T')[0],
      
      // Business info (default values)
      businessName: 'A-Frame Painting',
      businessAddress: '884 Hayes Rd',
      businessCity: 'Manson\'s Landing, BC',
      businessPostal: 'V0P1K0',
      businessEmail: 'cortespainter@gmail.com',
      businessLogo: currentLogo?.url || '/aframe-logo.png', // Dynamic business logo
    
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
      
      // Notes and payment (default values)
      notes: 'Please send e-transfer to cortespainter@gmail.com',
      emailMessage: 'Please find attached your invoice for painting services.',
      gstRate: 0.05, // 5% GST on labor services only
      suppliesCost: 0,
      selectedReceipts: new Set<number>()
    };
  });

  // Additional services state
  const [additionalServices, setAdditionalServices] = React.useState([
    { name: 'Power Washing', hours: '', rate: 60 },
    { name: 'Drywall Repair', hours: '', rate: 60 },
    { name: 'Wood Reconditioning', hours: '', rate: 60 }
  ]);

  // Additional workers state
  const [additionalWorkers, setAdditionalWorkers] = React.useState([
    { name: '', hours: '', rate: '' }
  ]);

  // Helper functions for additional services
  const updateAdditionalService = React.useCallback((index: number, field: string, value: string) => {
    setAdditionalServices(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const addAdditionalService = React.useCallback(() => {
    setAdditionalServices(prev => [...prev, { name: '', hours: '', rate: 60 }]);
  }, []);

  const removeAdditionalService = React.useCallback((index: number) => {
    if (index >= 3) {
      setAdditionalServices(prev => prev.filter((_, i) => i !== index));
    }
  }, []);

  // Helper functions for additional workers
  const updateAdditionalWorker = React.useCallback((index: number, field: string, value: string) => {
    setAdditionalWorkers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const addAdditionalWorker = React.useCallback(() => {
    setAdditionalWorkers(prev => [...prev, { name: '', hours: '', rate: '' }]);
  }, []);

  const removeAdditionalWorker = React.useCallback((index: number) => {
    if (additionalWorkers.length > 1) {
      setAdditionalWorkers(prev => prev.filter((_, i) => i !== index));
    }
  }, [additionalWorkers.length]);

  // Calculate additional services subtotal
  const additionalServicesSubtotal = React.useMemo(() => {
    return additionalServices.reduce((sum: number, service: any) => {
      const hours = parseFloat(service.hours) || 0;
      const rate = parseFloat(service.rate.toString()) || 0;
      return sum + (hours * rate);
    }, 0);
  }, [additionalServices]);

  // Calculate additional workers subtotal
  const additionalWorkersSubtotal = React.useMemo(() => {
    return additionalWorkers.reduce((sum: number, worker: any) => {
      const hours = parseFloat(worker.hours) || 0;
      const rate = parseFloat(worker.rate.toString()) || 0;
      return sum + (hours * rate);
    }, 0);
  }, [additionalWorkers]);

  // Paint Brain colors for invoice generator
  const paintBrainColors = {
    green: '#6A9955',         // Paint Brain green for headers and buttons
    primary: '#EA580C',        // Burnt orange (A-Frame brand color)
    secondary: '#DC2626',      // Red accent
    accent: '#10b981',         // Green for success/send buttons
    danger: '#ef4444',         // Red for delete actions
    background: '#0f172a',     // Dark navy background
    text: '#f1f5f9',          // Light text
    textLight: '#94a3b8',      // Muted text
    red: '#E03E3E',           // Paint Brain red
    yellow: '#F1C40F',        // Paint Brain yellow
    blue: '#3498DB',          // Paint Brain blue
    purple: '#8B5FBF'         // Paint Brain purple
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

  // Helper function to calculate material costs with markup
  const calculateMaterialCost = () => {
    const baseMaterialCost = receipts
      .filter(receipt => invoiceData.selectedReceipts.has(receipt.id))
      .reduce((sum, receipt) => sum + parseFloat(receipt.amount), 0);
    
    return materialMarkupEnabled && materialMarkupPercentage 
      ? baseMaterialCost * (1 + (parseFloat(materialMarkupPercentage) / 100))
      : baseMaterialCost;
  };

  const calculateSubtotal = () => {
    // Calculate labor total from daily hours
    const laborTotal = dailyHours.reduce((sum, hourEntry) => sum + (hourEntry.hours * (project.hourlyRate || 60)), 0);
    const materialCost = calculateMaterialCost();
    return laborTotal + invoiceData.suppliesCost + materialCost + additionalServicesSubtotal + additionalWorkersSubtotal;
  };

  const calculateGST = () => {
    // Get global tax configuration
    const getGlobalTaxConfig = () => {
      try {
        const saved = localStorage.getItem('taxConfiguration');
        return saved ? JSON.parse(saved) : { country: 'CA', gst: 5, pst: 0 };
      } catch {
        return { country: 'CA', gst: 5, pst: 0 };
      }
    };
    
    const taxConfig = getGlobalTaxConfig();
    // Only apply GST to labor and supplies, not to materials (receipts already include taxes)
    const laborTotal = dailyHours.reduce((sum, hourEntry) => sum + (hourEntry.hours * (project.hourlyRate || 60)), 0);
    return (laborTotal + invoiceData.suppliesCost + additionalServicesSubtotal + additionalWorkersSubtotal) * ((taxConfig.gst || 5) / 100);
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
      // Store original styles
      const originalStyles = {
        display: invoiceRef.current.style.display,
        visibility: invoiceRef.current.style.visibility,
        position: invoiceRef.current.style.position,
        top: invoiceRef.current.style.top,
        left: invoiceRef.current.style.left,
        opacity: invoiceRef.current.style.opacity,
        pointerEvents: invoiceRef.current.style.pointerEvents,
        zIndex: invoiceRef.current.style.zIndex,
        width: invoiceRef.current.style.width,
        height: invoiceRef.current.style.height,
        minHeight: invoiceRef.current.style.minHeight,
        maxHeight: invoiceRef.current.style.maxHeight,
        overflow: invoiceRef.current.style.overflow,
        transform: invoiceRef.current.style.transform
      };
      
      // Make element visible and properly positioned for capture with forced large height
      invoiceRef.current.style.display = 'block';
      invoiceRef.current.style.visibility = 'visible';
      invoiceRef.current.style.position = 'absolute';
      invoiceRef.current.style.top = '0px';
      invoiceRef.current.style.left = '0px';
      invoiceRef.current.style.opacity = '1';
      invoiceRef.current.style.pointerEvents = 'auto';
      invoiceRef.current.style.zIndex = '9999';
      invoiceRef.current.style.width = '794px';
      invoiceRef.current.style.height = '2000px'; // Force large height like email version
      invoiceRef.current.style.minHeight = '2000px';
      invoiceRef.current.style.maxHeight = 'none';
      invoiceRef.current.style.overflow = 'visible';
      invoiceRef.current.style.transform = 'none';
      
      // Force all child elements to expand and remove height constraints
      const allElements = invoiceRef.current.querySelectorAll('*');
      allElements.forEach((el: any) => {
        if (el.style) {
          el.style.maxHeight = 'none';
          el.style.height = 'auto';
          el.style.overflow = 'visible';
          el.style.whiteSpace = 'normal';
        }
      });

      // Wait longer for rendering and force multiple reflows
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Force reflow by accessing layout properties
      invoiceRef.current.scrollTop = 0;
      invoiceRef.current.scrollHeight;
      invoiceRef.current.offsetHeight;
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Ensure element has proper dimensions
      if (invoiceRef.current.scrollHeight === 0) {
        throw new Error('Invoice element has no height - not rendered properly');
      }

      console.log('Invoice element dimensions:', {
        scrollHeight: invoiceRef.current.scrollHeight,
        offsetHeight: invoiceRef.current.offsetHeight,
        clientHeight: invoiceRef.current.clientHeight
      });

      // Use optimized canvas height for 2-page PDF
      const elementHeight = 2000;

      // Capture the invoice preview with forced height like email version
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 1.5,
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: true,
        logging: true,
        width: 794,
        height: elementHeight,
        windowWidth: 794,
        windowHeight: elementHeight,
        removeContainer: false,
        onclone: (clonedDoc) => {
          console.log('Cloning document for PDF generation (downloadPDF)');
          const clonedElement = clonedDoc.querySelector('[data-invoice-ref]') as HTMLElement;
          if (clonedElement) {
            clonedElement.style.position = 'static';
            clonedElement.style.opacity = '1';
            clonedElement.style.visibility = 'visible';
            clonedElement.style.transform = 'none';
            clonedElement.style.width = '794px';
            clonedElement.style.display = 'block';
            
            // Set logo to proper size for PDF (same as EstimateGenerator)
            const logoElements = clonedElement.querySelectorAll('img[alt*="A-Frame Painting Logo"], img[alt*="Logo"]');
            console.log('Found logo elements for PDF download:', logoElements.length);
            logoElements.forEach((logo: any, index: number) => {
              if (logo) {
                console.log(`Setting download logo ${index} size to 32px`);
                console.log('Before styling:', logo.style.height, logo.className);
                logo.style.height = '32px !important';
                logo.style.maxHeight = '32px !important';
                logo.style.width = 'auto !important';
                logo.style.display = 'block !important';
                logo.style.objectFit = 'contain !important';
                logo.style.transform = 'none !important';
                console.log('After styling:', logo.style.height);
              }
            });
          }
        }
      });

      console.log('Canvas captured successfully:', {
        width: canvas.width,
        height: canvas.height
      });

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas has invalid dimensions');
      }

      // Restore original styling
      Object.assign(invoiceRef.current.style, originalStyles);

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
      
      // Handle multi-page content like email version
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // If content fits on one page, add it normally
      if (imgHeight <= pageHeight) {
        pdf.addImage(imageData, 'JPEG', 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-page handling: create separate canvases for each page
        let position = 0;
        let pageNumber = 0;
        
        // Calculate how many pixels per mm for proper scaling
        const pixelsPerMm = canvas.height / imgHeight;
        const pageHeightInPixels = pageHeight * pixelsPerMm;
        
        while (position < imgHeight) {
          if (pageNumber > 0) {
            pdf.addPage();
          }
          
          const remainingHeight = imgHeight - position;
          const currentPageHeight = Math.min(pageHeight, remainingHeight);
          
          console.log(`Adding invoice page ${pageNumber + 1}, position: ${position}mm, remaining: ${remainingHeight}mm`);
          
          // Create a separate canvas for this page
          const pageCanvas = document.createElement('canvas');
          const pageCtx = pageCanvas.getContext('2d');
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.floor(pageHeightInPixels);
          
          if (pageCtx) {
            // Fill with black background to eliminate white space
            pageCtx.fillStyle = '#000000';
            pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            
            // Copy the portion of the original canvas for this page
            const sourceY = Math.floor(position * pixelsPerMm);
            const sourceHeight = Math.min(pageHeightInPixels, canvas.height - sourceY);
            
            pageCtx.drawImage(
              canvas,
              0, sourceY, canvas.width, sourceHeight,
              0, 0, pageCanvas.width, sourceHeight
            );
            
            const pageImageData = pageCanvas.toDataURL('image/jpeg', 0.7);
            pdf.addImage(pageImageData, 'JPEG', 0, 0, pdfWidth, currentPageHeight);
          }
          
          position += pageHeight;
          pageNumber++;
        }
        
        console.log(`Generated multi-page invoice PDF with ${pageNumber} pages using canvas slicing`);
      }

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

      const filename = `Invoice-${invoiceData.invoiceNumber.toString().padStart(3, '0')}-${project.clientName || 'Client'}.pdf`;
      pdf.save(filename);
      
      // Increment invoice number for next invoice
      console.log('PDF download completed - incrementing invoice number');
      incrementInvoiceNumber();
      
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
      console.error('Invoice ref not available for PDF generation');
      return null;
    }

    console.log('Starting PDF generation...');
    
    try {
      // Store original styles
      const originalStyles = {
        display: invoiceRef.current.style.display,
        visibility: invoiceRef.current.style.visibility,
        position: invoiceRef.current.style.position,
        top: invoiceRef.current.style.top,
        left: invoiceRef.current.style.left,
        opacity: invoiceRef.current.style.opacity,
        pointerEvents: invoiceRef.current.style.pointerEvents,
        zIndex: invoiceRef.current.style.zIndex,
        width: invoiceRef.current.style.width,
        transform: invoiceRef.current.style.transform
      };
      
      // Make element visible and properly positioned for capture with forced large height
      invoiceRef.current.style.display = 'block';
      invoiceRef.current.style.visibility = 'visible';
      invoiceRef.current.style.position = 'absolute';
      invoiceRef.current.style.top = '0px';
      invoiceRef.current.style.left = '0px';
      invoiceRef.current.style.opacity = '1';
      invoiceRef.current.style.pointerEvents = 'auto';
      invoiceRef.current.style.zIndex = '9999';
      invoiceRef.current.style.width = '794px';
      invoiceRef.current.style.height = '2000px'; // Optimized for 2-page PDF
      invoiceRef.current.style.minHeight = '2000px';
      invoiceRef.current.style.maxHeight = 'none';
      invoiceRef.current.style.overflow = 'visible';
      invoiceRef.current.style.transform = 'none';
      
      // Force all child elements to expand and remove height constraints
      const allElements = invoiceRef.current.querySelectorAll('*');
      allElements.forEach((el: any) => {
        if (el.style) {
          el.style.maxHeight = 'none';
          el.style.height = 'auto';
          el.style.overflow = 'visible';
          el.style.whiteSpace = 'normal';
        }
      });

      // Wait longer for rendering and force multiple reflows
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Force reflow by accessing layout properties
      invoiceRef.current.scrollTop = 0;
      invoiceRef.current.scrollHeight;
      invoiceRef.current.offsetHeight;
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Element dimensions:', {
        scrollHeight: invoiceRef.current.scrollHeight,
        offsetHeight: invoiceRef.current.offsetHeight,
        clientHeight: invoiceRef.current.clientHeight
      });

      // Check if element is properly rendered
      if (!invoiceRef.current || invoiceRef.current.scrollHeight === 0) {
        console.error('Invoice element not properly rendered');
        // Restore original styles before throwing error
        Object.assign(invoiceRef.current.style, originalStyles);
        throw new Error('Invoice preview not properly rendered');
      }

      // Force a very large canvas height to ensure all content is captured
      const baseHeight = Math.max(
        invoiceRef.current.scrollHeight,
        invoiceRef.current.offsetHeight,
        invoiceRef.current.clientHeight
      );
      
      // Optimized canvas height for 2-page PDF
      const elementHeight = 2000;
      
      console.log('Invoice element dimensions:', {
        scrollHeight: invoiceRef.current.scrollHeight,
        offsetHeight: invoiceRef.current.offsetHeight,
        clientHeight: invoiceRef.current.clientHeight,
        calculatedHeight: elementHeight
      });
      
      // Capture the element using html2canvas
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 1.5, // Good balance between quality and file size
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: true,
        logging: true, // Enable logging for debugging
        width: 794,
        height: elementHeight,
        windowWidth: 794,
        windowHeight: elementHeight,
        removeContainer: false,
        onclone: (clonedDoc) => {
          console.log('Cloning document for canvas capture (emailPDF)');
          const clonedElement = clonedDoc.querySelector('[data-invoice-ref]') as HTMLElement;
          if (clonedElement) {
            clonedElement.style.position = 'static';
            clonedElement.style.opacity = '1';
            clonedElement.style.visibility = 'visible';
            clonedElement.style.transform = 'none';
            clonedElement.style.width = '794px';
            clonedElement.style.display = 'block';
            
            // Set logo to proper size for PDF (same as EstimateGenerator)
            const logoElements = clonedElement.querySelectorAll('img[alt*="A-Frame Painting Logo"], img[alt*="Logo"]');
            console.log('Found logo elements for PDF email:', logoElements.length);
            logoElements.forEach((logo: any, index: number) => {
              if (logo) {
                console.log(`Setting email logo ${index} size to 32px`);
                console.log('Before styling:', logo.style.height, logo.className);
                logo.style.height = '32px !important';
                logo.style.maxHeight = '32px !important';
                logo.style.width = 'auto !important';
                logo.style.display = 'block !important';
                logo.style.objectFit = 'contain !important';
                logo.style.transform = 'none !important';
                console.log('After styling:', logo.style.height);
              }
            });
          }
        }
      });
      
      console.log('Canvas captured:', {
        width: canvas.width,
        height: canvas.height
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

      // Handle multi-page content like estimates
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // If content fits on one page, add it normally
      if (imgHeight <= pageHeight) {
        pdf.addImage(imageData, 'JPEG', 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-page handling: create separate canvases for each page
        let position = 0;
        let pageNumber = 0;
        
        // Calculate how many pixels per mm for proper scaling
        const pixelsPerMm = canvas.height / imgHeight;
        const pageHeightPx = pageHeight * pixelsPerMm;
        
        while (position < imgHeight) {
          if (pageNumber > 0) {
            pdf.addPage();
          }
          
          console.log(`Adding invoice page ${pageNumber + 1}, position: ${position}mm, remaining: ${imgHeight - position}mm`);
          
          // Calculate the portion of canvas for this page
          const startY = position * pixelsPerMm;
          const endY = Math.min(startY + pageHeightPx, canvas.height);
          const pageCanvasHeight = endY - startY;
          
          // Create a canvas for just this page's content
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = pageCanvasHeight;
          const pageCtx = pageCanvas.getContext('2d');
          
          if (pageCtx) {
            // Copy the relevant portion of the original canvas
            pageCtx.drawImage(
              canvas,
              0, startY, canvas.width, pageCanvasHeight, // Source area
              0, 0, canvas.width, pageCanvasHeight      // Destination area
            );
            
            // Convert page canvas to image and add to PDF
            const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.8);
            const pageImgHeight = (pageCanvasHeight * imgWidth) / canvas.width;
            
            pdf.addImage(pageImgData, 'JPEG', 0, 0, imgWidth, pageImgHeight);
          }
          
          position += pageHeight;
          pageNumber++;
        }
        
        console.log(`Generated multi-page invoice PDF with ${pageNumber} pages using canvas slicing`);
      }
      
      // Log PDF info for debugging
      console.log('PDF pages:', pdf.getNumberOfPages());
      console.log('PDF size estimate:', pdf.output('blob').size, 'bytes');

      // Receipts are now sent as separate email attachments only (not embedded in PDF)

      // Restore original styles
      Object.assign(invoiceRef.current.style, originalStyles);

      console.log('PDF generation completed successfully');
      return pdf.output('blob');
    } catch (error) {
      console.error('Error generating PDF blob:', error);
      
      // Restore original styles even if error occurs
      if (invoiceRef.current) {
        invoiceRef.current.style.display = '';
        invoiceRef.current.style.visibility = '';
        invoiceRef.current.style.position = '';
        invoiceRef.current.style.top = '';
        invoiceRef.current.style.left = '';
        invoiceRef.current.style.opacity = '';
        invoiceRef.current.style.pointerEvents = '';
        invoiceRef.current.style.zIndex = '';
        invoiceRef.current.style.width = '';
        invoiceRef.current.style.transform = '';
      }
      
      return null;
    }
  };

  // Gmail OAuth email sending functionality
  const sendGmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      // Check if user has Gmail connected
      const statusResponse = await fetch(`/api/gmail/status/${user?.id}`);
      const statusData = await statusResponse.json();
      
      if (!statusData.connected) {
        // Fall back to SendGrid email system instead of throwing error
        return { useSendGrid: true };
      }

      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          to: emailData.recipientEmail,
          subject: `Invoice #${emailData.invoiceNumber} - A-Frame Painting`,
          message: emailData.message,
          htmlMessage: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #6A9955;">Invoice from A-Frame Painting</h2>
              <div style="white-space: pre-line; margin: 20px 0;">
                ${emailData.message.replace(/\n/g, '<br>')}
              </div>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc;">
                <p style="margin: 0;"><strong>A-Frame Painting</strong></p>
                <p style="margin: 0;">cortespainter@gmail.com</p>
                <p style="margin: 0;">884 Hayes Rd, Manson's Landing, BC V0P1K0</p>
              </div>
            </div>
          `,
          attachments: emailData.attachments || []
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }
      
      return response.json();
    },
    onSuccess: async (result: any) => {
      if (result?.useSendGrid) {
        // Trigger SendGrid email sending (this will handle its own increment)
        console.log('Gmail not connected - falling back to SendGrid');
        await sendViaSendGrid();
      } else {
        // Email sent successfully via Gmail - increment invoice number
        console.log('Gmail email sent successfully - incrementing invoice number');
        incrementInvoiceNumber();
        
        toast({
          title: "Email sent successfully!",
          description: "The invoice has been sent from your Gmail account.",
        });
        // Auto-close dialog after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    },
    onError: async (error: Error) => {
      console.log('Gmail error:', error.message);
      
      // If Gmail OAuth is not connected, offer clipboard fallback
      if (error.message.includes('Gmail account not connected') || error.message.includes('redirect_uri_mismatch')) {
        const laborTotal = dailyHours.reduce((sum, hourEntry) => sum + (hourEntry.hours * (project.hourlyRate || 60)), 0);
        const materialsTotal = receipts.reduce((sum, receipt) => sum + (Number(receipt.amount) || 0), 0);
        const subtotal = laborTotal + materialsTotal + invoiceData.suppliesCost;
        const gstAmount = (laborTotal + invoiceData.suppliesCost) * 0.05; // 5% GST
        const total = subtotal + gstAmount;

        const emailContent = `To: ${invoiceData.clientEmail || 'client@email.com'}
Subject: Invoice #${invoiceData.invoiceNumber} - A-Frame Painting

Dear ${invoiceData.clientName || 'Valued Client'},

Please find your invoice details below:

INVOICE #${invoiceData.invoiceNumber}
Date: ${new Date().toISOString().split('T')[0]}

Services & Labor:
${dailyHours.map(entry => `• ${new Date(entry.date).toLocaleDateString()}: ${entry.hours}h × $${project.hourlyRate || 60}/hr = $${(entry.hours * (project.hourlyRate || 60)).toFixed(2)}${entry.description ? ` (${entry.description})` : ''}`).join('\n')}

Materials from Receipts:
${receipts.map(receipt => `• ${receipt.vendor}: $${(Number(receipt.amount) || 0).toFixed(2)}`).join('\n')}

${invoiceData.suppliesCost > 0 ? `Additional Supplies: $${invoiceData.suppliesCost.toFixed(2)}` : ''}

Subtotal: $${subtotal.toFixed(2)}
GST (5%): $${gstAmount.toFixed(2)}
TOTAL: $${total.toFixed(2)}

${emailMessage || 'Payment is due within 30 days. Thank you for your business!'}

Best regards,
A-Frame Painting
cortespainter@gmail.com
884 Hayes Rd, Manson's Landing, BC V0P1K0`;

        try {
          await navigator.clipboard.writeText(emailContent);
          console.log('Invoice content copied to clipboard successfully');
          toast({
            title: "Gmail Setup Required",
            description: "Invoice content copied to clipboard. Connect Gmail in Settings for direct sending, or paste this into your email app.",
            duration: 8000,
          });
        } catch (clipboardError) {
          console.error('Clipboard error:', clipboardError);
          // Fallback: show the content in an alert
          alert('Gmail not connected. Here is the invoice email content:\n\n' + emailContent);
          toast({
            title: "Gmail Connection Required", 
            description: "Please connect your Gmail account in Settings to send invoices directly. Email content shown in popup.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Email failed",
          description: error.message || "Failed to send invoice email. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  // Clipboard fallback function
  const performClipboardFallback = async () => {
    const laborTotal = dailyHours.reduce((sum, hourEntry) => sum + (hourEntry.hours * (project.hourlyRate || 60)), 0);
    const materialsTotal = receipts.reduce((sum, receipt) => sum + (Number(receipt.amount) || 0), 0);
    const subtotal = laborTotal + materialsTotal + invoiceData.suppliesCost;
    const gstAmount = (laborTotal + invoiceData.suppliesCost) * 0.05; // 5% GST
    const total = subtotal + gstAmount;

    const emailContent = `To: ${invoiceData.clientEmail || 'client@email.com'}
Subject: Invoice #${invoiceData.invoiceNumber} - A-Frame Painting

Dear ${invoiceData.clientName || 'Valued Client'},

Please find your invoice details below:

INVOICE #${invoiceData.invoiceNumber}
Date: ${new Date().toISOString().split('T')[0]}

Services & Labor:
${dailyHours.map(entry => `• ${new Date(entry.date).toLocaleDateString()}: ${entry.hours}h × $${project.hourlyRate || 60}/hr = $${(entry.hours * (project.hourlyRate || 60)).toFixed(2)}${entry.description ? ` (${entry.description})` : ''}`).join('\n')}

Materials from Receipts:
${receipts.map(receipt => `• ${receipt.vendor}: $${(Number(receipt.amount) || 0).toFixed(2)}`).join('\n')}

${invoiceData.suppliesCost > 0 ? `Additional Supplies: $${invoiceData.suppliesCost.toFixed(2)}` : ''}

Subtotal: $${subtotal.toFixed(2)}
GST (5%): $${gstAmount.toFixed(2)}
TOTAL: $${total.toFixed(2)}

${emailMessage || 'Payment is due within 30 days. Thank you for your business!'}

Best regards,
A-Frame Painting
cortespainter@gmail.com
884 Hayes Rd, Manson's Landing, BC V0P1K0`;

    try {
      await navigator.clipboard.writeText(emailContent);
      toast({
        title: "Email Ready!",
        description: "Complete invoice email copied to clipboard. Open Gmail and paste!",
        duration: 8000,
      });
      
      // Auto-close dialog after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (clipboardError) {
      console.error('Clipboard error:', clipboardError);
      alert('Gmail not connected. Here is the invoice email content:\n\n' + emailContent);
      toast({
        title: "Gmail Setup Needed", 
        description: "Connect Gmail in Settings for direct sending. Email content shown in popup.",
        variant: "destructive",
      });
    }
  };

  // SendGrid email sending function
  const sendViaSendGrid = async () => {
    if (!invoiceData.clientEmail) {
      toast({
        title: "No Email Address",
        description: "Please add client email to send invoice",
        variant: "destructive",
      });
      return;
    }



    try {
      // Show preparing message
      toast({
        title: "Sending Email",
        description: "Preparing invoice email...",
      });

      // Generate PDF for attachment
      const pdfBlob = await generatePDFBlob();
      let pdfBase64 = '';
      
      if (pdfBlob) {
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        pdfBase64 = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
      }

      // Prepare email data
      const laborTotal = dailyHours.reduce((sum, hourEntry) => sum + (hourEntry.hours * (project.hourlyRate || 60)), 0);
      const materialsTotal = receipts.reduce((sum, receipt) => sum + (Number(receipt.amount) || 0), 0);
      const subtotal = laborTotal + materialsTotal + invoiceData.suppliesCost;
      const gstAmount = (laborTotal + invoiceData.suppliesCost) * 0.05;
      const total = subtotal + gstAmount;

      // Prepare data for existing invoice email API
      const emailData = {
        recipientEmail: invoiceData.clientEmail,
        clientName: invoiceData.clientName || 'Valued Client',
        invoiceNumber: invoiceData.invoiceNumber,
        pdfData: pdfBase64,
        receiptFilenames: [], // No separate receipt files - they're in the PDF
        customMessage: emailMessage || 'Payment is due within 30 days. Thank you for your business!'
      };

      // Send via existing route
      const response = await fetch('/api/send-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }

      // Increment invoice number for next invoice
      console.log('SendGrid email sent - incrementing invoice number');
      incrementInvoiceNumber();
      
      toast({
        title: "Email Sent Successfully!",
        description: `Invoice sent to ${invoiceData.clientEmail}`,
      });

      // Auto-close dialog after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (error: any) {
      console.error('SendGrid email failed:', error);
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send invoice email. Please try again.",
        variant: "destructive",
      });
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
    
    const textBody = emailMessage;

    try {
      // Show loading state
      toast({
        title: "Preparing Email",
        description: "Generating PDF and preparing email...",
      });

      // Generate PDF first and get it as base64
      const pdfBlob = await generatePDFBlob();
      
      if (pdfBlob) {
        // Convert to base64 for Gmail sending
        const reader = new FileReader();
        reader.onloadend = async () => {
          const pdfBase64 = reader.result?.toString().split(',')[1];
          const pdfFilename = `Invoice-${invoiceData.invoiceNumber}-${invoiceData.clientName.replace(/\s+/g, '-')}.pdf`;
          
          // Prepare attachments array
          const attachments = [{
            filename: pdfFilename,
            content: pdfBase64,
            mimeType: 'application/pdf'
          }];

          // Add selected receipt attachments
          if (invoiceData.selectedReceipts.size > 0) {
            const selectedReceiptsArray = Array.from(invoiceData.selectedReceipts);
            for (const receiptId of selectedReceiptsArray) {
              const receipt = receipts.find(r => r.id === receiptId);
              if (receipt?.filename) {
                // Note: Receipt file processing would need server-side implementation
                // For now, we'll just include the PDF
              }
            }
          }

          // First check if user has Gmail OAuth connected
          const gmailStatusResponse = await fetch(`/api/gmail/status/1`); // Using userId 1 for now
          const gmailStatus = await gmailStatusResponse.json();
          
          if (gmailStatus.connected) {
            // Use Gmail OAuth API - sends from user's personal Gmail account
            const gmailResponse = await fetch('/api/gmail/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: 1, // Using userId 1 for now
                to: invoiceData.clientEmail,
                subject: `Invoice #${invoiceData.invoiceNumber} - A-Frame Painting`,
                message: emailMessage || 'Payment is due within 30 days. Thank you for your business!',
                htmlMessage: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: white; color: black;">
                    <h2 style="color: #6A9955;">Invoice from A-Frame Painting</h2>
                    <div style="white-space: pre-line; margin: 20px 0;">
                      ${(emailMessage || 'Payment is due within 30 days. Thank you for your business!').replace(/\n/g, '<br>')}
                    </div>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc;">
                      <p style="margin: 0;"><strong>A-Frame Painting</strong></p>
                      <p style="margin: 0;">${gmailStatus.gmailAddress}</p>
                      <p style="margin: 0;">884 Hayes Rd, Manson's Landing, BC V0P1K0</p>
                    </div>
                  </div>
                `,
                attachments: [{
                  filename: pdfFilename,
                  content: pdfBase64,
                  mimeType: 'application/pdf'
                }]
              })
            });
            
            if (!gmailResponse.ok) {
              const error = await gmailResponse.json();
              throw new Error(error.error || 'Failed to send via Gmail OAuth');
            }
            
            // Increment invoice number for next invoice
            console.log('Gmail OAuth email sent - incrementing invoice number');
            incrementInvoiceNumber();
            
            toast({
              title: "Email Sent via Gmail!",
              description: `Invoice sent from your Gmail account (${gmailStatus.gmailAddress}) to ${invoiceData.clientEmail}`,
            });
            
          } else {
            // Fallback to server SMTP system
            const response = await fetch('/api/send-invoice-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipientEmail: invoiceData.clientEmail,
                clientName: invoiceData.clientName || 'Valued Client',
                invoiceNumber: invoiceData.invoiceNumber,
                pdfData: pdfBase64,
                receiptFilenames: [], // No separate receipt files
                customMessage: emailMessage || 'Payment is due within 30 days. Thank you for your business!'
              })
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to send email');
            }

            // Increment invoice number for next invoice
            console.log('Server SMTP email sent - incrementing invoice number');
            incrementInvoiceNumber();
            
            toast({
              title: "Email Sent via Server!",
              description: `Invoice sent to ${invoiceData.clientEmail} (Connect Gmail in Settings for personal account sending)`,
            });
          }

          // Auto-close dialog after 3 seconds
          setTimeout(() => {
            onClose();
          }, 3000);
        };
        reader.readAsDataURL(pdfBlob);
      }

    } catch (error) {
      console.error('Email sending failed:', error);
      
      // Fallback to clipboard only
      const emailContent = `To: ${invoiceData.clientEmail}
Subject: Invoice #${invoiceData.invoiceNumber} - A-Frame Painting

${emailMessage}`;

      navigator.clipboard.writeText(emailContent).catch((err) => {
        console.log('Clipboard fallback needed:', err);
      });
      
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
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto p-0 [&>button]:hidden" style={{ backgroundColor: darkTheme.background }}>
        <DialogHeader className="sr-only">
          <DialogTitle>Invoice</DialogTitle>
          <DialogDescription>Create and send professional painting service invoices</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b" style={{ backgroundColor: darkTheme.headerBg, borderColor: darkTheme.border }}>
            <div></div> {/* Spacer for centering */}
            <div className="text-center">


            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6 space-y-6" style={{ backgroundColor: darkTheme.background }}>
              {/* Business & Invoice Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border space-y-4" style={{ borderColor: paintBrainColors.red, backgroundColor: darkTheme.cardBg }}>
                <h2 className="text-xl font-semibold flex items-center" style={{ color: paintBrainColors.red }}>
                  <User className="mr-2 h-5 w-5" />
                  Business Information
                </h2>
                <div className="space-y-2">
                  <Input
                    ref={firstInputRef}
                    value={invoiceData.businessName}
                    onChange={(e) => setInvoiceData({...invoiceData, businessName: e.target.value})}
                    className="bg-gray-800 border-[#E03E3E] text-white"
                    placeholder="Business Name"
                    autoFocus={false}
                    style={{ userSelect: 'text' }} // Allow selection after user interaction
                    onFocus={(e) => {
                      // Prevent text selection on focus - use setTimeout to override browser default
                      setTimeout(() => {
                        (e.target as HTMLInputElement).setSelectionRange(0, 0);
                      }, 0);
                    }}
                    onMouseUp={(e) => {
                      // Prevent text selection on mouse/touch interaction
                      e.preventDefault();
                      setTimeout(() => {
                        (e.target as HTMLInputElement).setSelectionRange(0, 0);
                      }, 0);
                    }}
                    onTouchStart={(e) => {
                      // Prevent text selection on touch devices
                      setTimeout(() => {
                        (e.target as HTMLInputElement).setSelectionRange(0, 0);
                      }, 0);
                    }}
                  />
                  <Input
                    value={invoiceData.businessAddress}
                    onChange={(e) => setInvoiceData({...invoiceData, businessAddress: e.target.value})}
                    className="bg-gray-800 border-[#E03E3E] text-white"  
                    placeholder="Address"
                  />
                  <Input
                    value={invoiceData.businessEmail}
                    onChange={(e) => setInvoiceData({...invoiceData, businessEmail: e.target.value})}
                    className="bg-gray-800 border-[#E03E3E] text-white"
                    placeholder="Email"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg border space-y-4" style={{ borderColor: paintBrainColors.yellow, backgroundColor: darkTheme.cardBg }}>
                <h2 className="text-xl font-semibold flex items-center" style={{ color: paintBrainColors.yellow }}>
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
                      className="bg-gray-800 border-[#ECC94B] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: darkTheme.textSecondary }}>Date</label>
                    <Input
                      type="date"
                      value={invoiceData.date}
                      onChange={(e) => setInvoiceData({...invoiceData, date: e.target.value})}
                      className="bg-gray-800 border-[#ECC94B] text-white"
                    />
                  </div>
                  {/* Material Markup Control */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: '#ECC94B' }}>
                      <span className="text-sm font-medium" style={{ color: darkTheme.text }}>
                        Supplies
                      </span>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs" style={{ color: darkTheme.textSecondary }}>
                          No Markup
                        </span>
                        <div className="relative inline-block w-12 h-6">
                          <input
                            type="checkbox"
                            id="invoice-material-markup-toggle"
                            checked={materialMarkupEnabled}
                            onChange={(e) => setMaterialMarkupEnabled(e.target.checked)}
                            className="sr-only"
                          />
                          <label 
                            htmlFor="invoice-material-markup-toggle" 
                            className="block w-12 h-6 rounded-full cursor-pointer transition-colors bg-gray-600"
                          >
                            <span 
                              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                materialMarkupEnabled ? 'translate-x-6' : 'translate-x-0'
                              }`}
                            />
                          </label>
                        </div>
                        <span className="text-xs" style={{ color: materialMarkupEnabled ? '#E53E3E' : darkTheme.textSecondary }}>
                          Markup
                        </span>
                      </div>
                    </div>
                    
                    {materialMarkupEnabled && (
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: darkTheme.textSecondary }}>Markup Percentage</label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={materialMarkupPercentage}
                            onChange={(e) => setMaterialMarkupPercentage(e.target.value)}
                            placeholder="Enter markup %"
                            className="bg-gray-800 border-[#ECC94B] text-white pr-8"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="p-4 rounded-lg border space-y-4" style={{ borderColor: paintBrainColors.green, backgroundColor: darkTheme.cardBg }}>
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowClientInfo(!showClientInfo)}>
                <h2 className="text-xl font-semibold flex items-center" style={{ color: paintBrainColors.green }}>
                  <MapPin className="mr-2 h-5 w-5" />
                  Client Information
                </h2>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform duration-200 ${showClientInfo ? 'transform rotate-180' : ''}`}
                  style={{ color: paintBrainColors.green }}
                />
              </div>
              {showClientInfo && (
                <div className="space-y-4">
                <Input
                  value={invoiceData.clientName}
                  onChange={(e) => setInvoiceData({...invoiceData, clientName: e.target.value})}
                  className="bg-gray-800 border-[#6A9955] text-white"
                  placeholder="Client Name"
                />
                <Input
                  type="email"
                  value={invoiceData.clientEmail}
                  onChange={(e) => setInvoiceData({...invoiceData, clientEmail: e.target.value})}
                  className="bg-gray-800 border-[#6A9955] text-white"
                  placeholder="Client Email"
                />
                <Input
                  value={invoiceData.clientAddress}
                  onChange={(e) => setInvoiceData({...invoiceData, clientAddress: e.target.value})}
                  className="bg-gray-800 border-[#6A9955] text-white"
                  placeholder="Client Address"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={invoiceData.clientCity}
                    onChange={(e) => setInvoiceData({...invoiceData, clientCity: e.target.value})}
                    className="bg-gray-800 border-[#6A9955] text-white"
                    placeholder="City, Province"
                  />
                  <Input
                    value={invoiceData.clientPostal}
                    onChange={(e) => setInvoiceData({...invoiceData, clientPostal: e.target.value})}
                    className="bg-gray-800 border-[#6A9955] text-white"
                    placeholder="Postal Code"
                  />
                </div>
              </div>
              )}
            </div>





            {/* Materials */}
            {receipts.length > 0 && (
              <div className="p-4 rounded-lg border space-y-4" style={{ borderColor: paintBrainColors.purple, backgroundColor: darkTheme.cardBg }}>
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowMaterials(!showMaterials)}>
                  <h2 className="text-xl font-semibold flex items-center" style={{ color: paintBrainColors.purple }}>
                    <Wrench className="mr-2 h-5 w-5" />
                    Materials & Receipts
                  </h2>
                  <ChevronDown 
                    className={`h-5 w-5 transition-transform duration-200 ${showMaterials ? 'transform rotate-180' : ''}`}
                    style={{ color: paintBrainColors.purple }}
                  />
                </div>
                {showMaterials && (
                  <div>
                
                {/* Display receipt items with OCR data */}
                <div className="space-y-3 mb-4">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="border rounded-lg p-2" style={{ borderColor: '#8B5FBF' }}>
                      <div className="flex justify-between items-start text-sm mb-1">
                        <span className="font-medium flex-1 pr-2 break-words" style={{ color: darkTheme.text }}>{receipt.vendor}</span>
                        <span className="font-semibold flex-shrink-0" style={{ color: darkTheme.text }}>${receipt.amount}</span>
                      </div>
                      {receipt.items && receipt.items.length > 0 && (
                        <div className="text-xs space-y-1">
                          {receipt.items.map((item, index) => (
                            <div key={index} className="pl-2 break-words" style={{ color: darkTheme.textSecondary }}>
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
              </div>
            )}

            {/* Services & Labor - Combined Container (Blue) */}
            <div className="p-4 rounded-lg border space-y-6" style={{ borderColor: paintBrainColors.blue, backgroundColor: darkTheme.cardBg }}>
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowServicesLabor(!showServicesLabor)}>
                <h2 className="text-xl font-semibold flex items-center" style={{ color: paintBrainColors.blue }}>
                  <Users className="mr-2 h-5 w-5" />
                  Services & Labor
                </h2>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform duration-200 ${showServicesLabor ? 'transform rotate-180' : ''}`}
                  style={{ color: paintBrainColors.blue }}
                />
              </div>
              
              {showServicesLabor && (
                <>
                  {/* Time Logged Hours Section - Primary Labor */}
                  <div>
                    <h3 className="text-lg font-semibold flex items-center mb-3" style={{ color: paintBrainColors.blue }}>
                      <Clock className="mr-2 h-4 w-4" />
                      Time Logged Hours
                    </h3>
                    <div className="space-y-3">
                      {dailyHours.map((hourEntry, index) => (
                        <div key={index} className="border rounded-lg p-3" style={{ borderColor: paintBrainColors.blue }}>
                          <div className="flex justify-between items-center">
                            <span style={{ color: darkTheme.text }}>
                              {hourEntry.description || 'Painting'}: {hourEntry.hours}h × ${project.hourlyRate || 60}/hr
                            </span>
                            <span className="font-semibold" style={{ color: darkTheme.text }}>
                              ${(hourEntry.hours * (project.hourlyRate || 60)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {dailyHours.length > 0 && (
                      <div className="pt-3 border-t border-blue-400/30">
                        <div className="flex justify-between items-center">
                          <span className="font-medium" style={{ color: darkTheme.text }}>Primary Labor Subtotal:</span>
                          <span className="font-semibold text-blue-400">${dailyHours.reduce((sum, hourEntry) => sum + (hourEntry.hours * (project.hourlyRate || 60)), 0).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Workers Section */}
                  <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: paintBrainColors.blue, backgroundColor: `${paintBrainColors.blue}10` }}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold flex items-center" style={{ color: paintBrainColors.blue }}>
                        <Users className="mr-2 h-4 w-4" />
                        Additional Workers
                      </h3>
                      <Button
                        onClick={addAdditionalWorker}
                        size="xs"
                        className="text-blue-400 border-blue-400 bg-transparent hover:bg-blue-400 hover:text-white px-2 py-1 text-xs"
                        variant="outline"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Worker
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {additionalWorkers.map((worker, index) => (
                        <div key={index} className="grid gap-2 items-end" style={{gridTemplateColumns: 'minmax(180px, 2fr) 60px 50px 100px'}}>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: darkTheme.textSecondary }}>Employee Name</label>
                            <Input
                              value={worker.name}
                              onChange={(e) => updateAdditionalWorker(index, 'name', e.target.value)}
                              placeholder="Enter full employee name"
                              className="bg-gray-800 border-blue-400 text-white w-full"
                            />
                          </div>
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium mb-1" style={{ color: darkTheme.textSecondary }}>Hours</label>
                            <div style={{ width: '60px', minWidth: '60px' }}>
                              <Input
                                type="number"
                                value={worker.hours}
                                onChange={(e) => updateAdditionalWorker(index, 'hours', e.target.value)}
                                placeholder="0"
                                min="0"
                                max="999"
                                step="0.25"
                                className="bg-gray-800 border-blue-400 text-white text-center"
                                style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
                              />
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium mb-1" style={{ color: darkTheme.textSecondary }}>Rate</label>
                            <div style={{ width: '50px', minWidth: '50px' }}>
                              <Input
                                type="number"
                                value={worker.rate}
                                onChange={(e) => updateAdditionalWorker(index, 'rate', e.target.value)}
                                placeholder="60"
                                min="0"
                                max="99"
                                step="1"
                                className="bg-gray-800 border-blue-400 text-white text-center"
                                style={{ width: '50px', minWidth: '50px', maxWidth: '50px' }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between flex-shrink-0" style={{ minWidth: '100px' }}>
                            <span className="text-sm font-medium" style={{ color: darkTheme.text }}>
                              ${((parseFloat(worker.hours) || 0) * (parseFloat(worker.rate.toString()) || 0)).toFixed(2)}
                            </span>
                            {additionalWorkers.length > 1 && (
                              <Button
                                onClick={() => removeAdditionalWorker(index)}
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 ml-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {additionalWorkersSubtotal > 0 && (
                        <div className="pt-2 border-t border-blue-400/30">
                          <div className="flex justify-between items-center">
                            <span className="font-medium" style={{ color: darkTheme.text }}>Additional Workers Subtotal:</span>
                            <span className="font-semibold text-blue-400">${additionalWorkersSubtotal.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Services Section */}
                  <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: paintBrainColors.blue, backgroundColor: `${paintBrainColors.blue}10` }}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold flex items-center" style={{ color: paintBrainColors.blue }}>
                        <Wrench className="mr-2 h-4 w-4" />
                        Additional Services
                      </h3>
                      <Button
                        onClick={addAdditionalService}
                        size="xs"
                        className="text-blue-400 border-blue-400 bg-transparent hover:bg-blue-400 hover:text-white px-2 py-1 text-xs"
                        variant="outline"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Service
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {additionalServices.map((service, index) => (
                        <div key={index} className="grid gap-2 items-end" style={{gridTemplateColumns: 'minmax(180px, 2fr) 60px 50px 100px'}}>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: darkTheme.textSecondary }}>Service Description</label>
                            <Input
                              value={service.name}
                              onChange={(e) => updateAdditionalService(index, 'name', e.target.value)}
                              placeholder="Enter detailed service description"
                              className="bg-gray-800 border-blue-400 text-white w-full"
                            />
                          </div>
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium mb-1" style={{ color: darkTheme.textSecondary }}>Hours</label>
                            <div style={{ width: '60px', minWidth: '60px' }}>
                              <Input
                                type="number"
                                value={service.hours}
                                onChange={(e) => updateAdditionalService(index, 'hours', e.target.value)}
                                placeholder="0"
                                min="0"
                                max="999"
                                step="0.25"
                                className="bg-gray-800 border-blue-400 text-white text-center"
                                style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
                              />
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium mb-1" style={{ color: darkTheme.textSecondary }}>Rate</label>
                            <div style={{ width: '50px', minWidth: '50px' }}>
                              <Input
                                type="number"
                                value={service.rate}
                                onChange={(e) => updateAdditionalService(index, 'rate', e.target.value)}
                                placeholder="60"
                                min="0"
                                max="99"
                                step="1"
                                className="bg-gray-800 border-blue-400 text-white text-center"
                                style={{ width: '50px', minWidth: '50px', maxWidth: '50px' }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between flex-shrink-0" style={{ minWidth: '100px' }}>
                            <span className="text-sm font-medium" style={{ color: darkTheme.text }}>
                              ${((parseFloat(service.hours) || 0) * (parseFloat(service.rate.toString()) || 0)).toFixed(2)}
                            </span>
                            {index >= 3 && (
                              <Button
                                onClick={() => removeAdditionalService(index)}
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 ml-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {additionalServicesSubtotal > 0 && (
                        <div className="pt-2 border-t border-blue-400/30">
                          <div className="flex justify-between items-center">
                            <span className="font-medium" style={{ color: darkTheme.text }}>Additional Services Subtotal:</span>
                            <span className="font-semibold text-blue-400">${additionalServicesSubtotal.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Totals */}
            <div className="p-4 rounded-lg border space-y-4" style={{ borderColor: paintBrainColors.purple, backgroundColor: darkTheme.cardBg }}>
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowTotals(!showTotals)}>
                <h2 className="text-xl font-semibold flex items-center" style={{ color: paintBrainColors.purple }}>
                  <Calendar className="mr-2 h-5 w-5" />
                  Invoice Totals
                </h2>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform duration-200 ${showTotals ? 'transform rotate-180' : ''}`}
                  style={{ color: paintBrainColors.purple }}
                />
              </div>
              {showTotals && (
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                <div className="flex justify-between py-2 border-b" style={{ borderColor: darkTheme.border }}>
                  <span className="font-medium" style={{ color: darkTheme.text }}>Labor:</span>
                  <span className="font-semibold" style={{ color: darkTheme.text }}>${dailyHours.reduce((sum, hourEntry) => sum + (hourEntry.hours * (project.hourlyRate || 60)), 0).toFixed(2)}</span>
                </div>
                {additionalServicesSubtotal > 0 && (
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: darkTheme.border }}>
                    <span className="font-medium" style={{ color: darkTheme.text }}>Additional Services:</span>
                    <span className="font-semibold" style={{ color: darkTheme.text }}>${additionalServicesSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {additionalWorkersSubtotal > 0 && (
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: darkTheme.border }}>
                    <span className="font-medium" style={{ color: darkTheme.text }}>Additional Workers:</span>
                    <span className="font-semibold" style={{ color: darkTheme.text }}>${additionalWorkersSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {invoiceData.suppliesCost > 0 && (
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: darkTheme.border }}>
                    <span className="font-medium" style={{ color: darkTheme.text }}>Additional Supplies:</span>
                    <span className="font-semibold" style={{ color: darkTheme.text }}>${invoiceData.suppliesCost.toFixed(2)}</span>
                  </div>
                )}
                {receipts.filter(receipt => invoiceData.selectedReceipts.has(receipt.id)).length > 0 && (
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: darkTheme.border }}>
                    <span className="font-medium" style={{ color: darkTheme.text }}>
                      Materials {materialMarkupEnabled && materialMarkupPercentage ? `(+${materialMarkupPercentage}% markup)` : '(incl. taxes)'}:
                    </span>
                    <span className="font-semibold" style={{ color: darkTheme.text }}>${calculateMaterialCost().toFixed(2)}</span>
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

                <div className="flex justify-between py-3 text-lg font-bold" style={{ color: darkTheme.text }}>
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
                </div>
              )}
            </div>



            {/* Email Message Section - Restored Yellow Container */}
            <div className="p-4 rounded-lg border space-y-4" style={{ borderColor: '#ECC94B', backgroundColor: darkTheme.cardBg }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center" style={{ color: '#ECC94B' }}>
                  <Send className="mr-2 h-5 w-5" />
                  Email Message
                </h2>
                <div className="flex items-center space-x-3">
                  {emailSaveStatus === 'saving' && (
                    <span className="text-xs text-yellow-400 flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-400"></div>
                    </span>
                  )}
                  {emailSaveStatus === 'saved' && (
                    <span className="text-xs text-green-400 flex items-center">
                      ✓ Saved
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetEmailToDefault}
                    className="text-xs text-yellow-400 border-yellow-400 hover:bg-yellow-400 hover:text-black"
                  >
                    Reset to Default
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: darkTheme.textSecondary }}>
                  Custom message for email body (auto-saved)
                </label>
                <Textarea
                  value={emailMessage}
                  onChange={(e) => {
                    setEmailMessage(e.target.value);
                    setUserHasEdited(true); // Mark that user has made an edit
                  }}
                  className="bg-gray-800 border-[#ECC94B] text-white min-h-20"
                  placeholder="Enter your custom message..."
                />
              </div>
            </div>

            {/* Action Toggle with Dynamic Label - Matching EstimateGenerator */}
            <div className="flex flex-col items-center gap-4 mb-6 p-6 bg-black rounded-lg border border-gray-600" style={{ 
              borderColor: actionMode === 'email' ? '#EA580C' : '#8B5FBF' 
            }}>
              {/* Toggle Switch */}
              <button
                onClick={() => setActionMode(actionMode === 'email' ? 'download' : 'email')}
                className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                  actionMode === 'email' ? 'bg-[#EA580C]' : 'bg-[#8B5FBF]'
                }`}
              >
                <span
                  className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform duration-200 ${
                    actionMode === 'email' ? 'translate-x-1' : 'translate-x-11'
                  }`}
                />
              </button>
              
              {/* Dynamic Action Label */}
              <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => {
                  if (actionMode === 'email') {
                    sendInvoice();
                  } else {
                    generatePDF();
                  }
                }}
              >
                {actionMode === 'email' ? (
                  <>
                    <Mail className="w-8 h-8 text-[#EA580C]" />
                    <span className="text-[#EA580C] text-xl font-bold">Send</span>
                  </>
                ) : (
                  <>
                    <Download className="w-8 h-8 text-[#8B5FBF]" />
                    <span className="text-[#8B5FBF] text-xl font-bold">PDF</span>
                  </>
                )}
              </div>
              
              {/* Status Text */}
              {isSending && (
                <div className="text-[#EA580C] text-sm font-medium">
                  Sending invoice...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Preview (for PDF generation) - v2025.1 */}
        <div ref={invoiceRef} data-invoice-ref className="fixed -top-[9999px] -left-[9999px] w-[794px] opacity-0 pointer-events-none print:static print:opacity-100 print:pointer-events-auto print:block print:max-w-none" style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: 'auto', paddingBottom: '40px' }}>
          <div className="p-8">
            {/* Header Section */}
            <div className="mb-8">
              {/* Logo Only */}
              {logoVisibility.emails && (
                <div className="flex justify-center mb-4">
                  <img 
                    src={`${currentLogo?.url || '/paint-brain-logo.png'}?v=${Date.now()}`} 
                    alt="A-Frame Painting Logo" 
                    className="h-8 w-auto object-contain"
                    style={{ height: '32px', width: 'auto', objectFit: 'contain', maxHeight: '32px', maxWidth: '200px' }}
                  />
                </div>
              )}
            </div>

            {/* Invoice Title and Info - Aligned left with invoice details on right */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-[#8B5FBF]">INVOICE</h1>
              </div>
              <div className="text-right">
                <p><strong>Invoice #:</strong> {invoiceData.invoiceNumber}</p>
                <p><strong>Date:</strong> {invoiceData.date.replace('2025-', '').replace(/-/g, '/')}</p>
              </div>
            </div>

            <div className="flex justify-between mb-8">
              <div className="w-1/2 pr-4">
                <h3 className="text-lg font-semibold text-[#8B5FBF] mb-2">To:</h3>
                <p>{invoiceData.clientName}</p>
                <p>{invoiceData.clientAddress}</p>
                <p>{invoiceData.clientCity} {invoiceData.clientPostal}</p>
                {invoiceData.clientPhone && <p>{invoiceData.clientPhone}</p>}
                {invoiceData.clientEmail && <p>{invoiceData.clientEmail}</p>}
              </div>
              <div className="w-1/2 pl-4">
                <h3 className="text-lg font-semibold text-[#8B5FBF] mb-2">From:</h3>
                <p>{invoiceData.businessName}</p>
                <p>{invoiceData.businessAddress}</p>
                <p>{invoiceData.businessCity}</p>
                <p>{invoiceData.businessEmail}</p>
              </div>
            </div>

            {/* Services & Labor Section - 2-Column Layout (Updated Jan 2025) */}
            {dailyHours.length > 0 && (
              <div className="mb-6">
                <div className="p-4 rounded-t-lg" style={{ backgroundColor: '#E53E3E' }}>
                  <h3 className="text-lg font-semibold text-white">Services & Labor</h3>
                </div>
                <div className="rounded-b-lg border-2 border-t-0" style={{ borderColor: '#E53E3E', backgroundColor: '#2D3748' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#4A5568' }}>
                        <th className="p-3 text-left text-white font-semibold">Service</th>
                        <th className="p-3 text-right text-white font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyHours.map((hourEntry, index) => (
                        <tr key={index} className={index % 2 === 0 ? '' : 'bg-gray-700'} style={{ borderBottom: '1px solid #E53E3E' }}>
                          <td className="p-3 text-white">
                            {(() => {
                              // Format date for PDF (without year)
                              const dateStr = hourEntry.date.toString();
                              const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
                              const [year, month, day] = datePart.split('-').map(Number);
                              const localDate = new Date(year, month - 1, day);
                              const formattedDate = localDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              });
                              return `${hourEntry.description || 'Painting'} (${formattedDate}): ${hourEntry.hours}h × $${project.hourlyRate || 60}/hr`;
                            })()}
                          </td>
                          <td className="p-3 text-right font-semibold text-white">
                            ${(hourEntry.hours * (project.hourlyRate || 60)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ borderBottom: '1px solid #E53E3E' }}>
                        <td className="p-3 text-left font-semibold text-white">Labor Subtotal</td>
                        <td className="p-3 text-right font-semibold text-[#6A9955]">
                          ${dailyHours.reduce((sum, hourEntry) => sum + (hourEntry.hours * (project.hourlyRate || 60)), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Materials & Supplies Section - Table format matching estimate */}
            {(receipts.filter(receipt => invoiceData.selectedReceipts.has(receipt.id)).length > 0 || invoiceData.suppliesCost > 0) && (
              <div className="mb-6">
                <div className="p-4 rounded-t-lg" style={{ backgroundColor: '#ECC94B' }}>
                  <h3 className="text-lg font-semibold text-white">Paint & Materials (incl. taxes)</h3>
                </div>
                <div className="rounded-b-lg border-2 border-t-0" style={{ borderColor: '#ECC94B', backgroundColor: '#2D3748' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#4A5568' }}>
                        <th className="p-3 text-left text-white font-semibold">Item</th>
                        <th className="p-3 text-right text-white font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.filter(receipt => invoiceData.selectedReceipts.has(receipt.id)).map((receipt, index) => (
                        <tr key={index} className={index % 2 === 0 ? '' : 'bg-gray-700'} style={{ borderBottom: '1px solid #ECC94B' }}>
                          <td className="p-3 text-white">
                            {receipt.vendor || 'Materials'}: {receipt.description || receipt.items}
                          </td>
                          <td className="p-3 text-right font-semibold text-white">
                            ${(Number(receipt.amount) || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {invoiceData.suppliesCost > 0 && (
                        <tr className={receipts.filter(receipt => invoiceData.selectedReceipts.has(receipt.id)).length % 2 === 0 ? '' : 'bg-gray-700'} style={{ borderBottom: '1px solid #ECC94B' }}>
                          <td className="p-3 text-white">Additional Supplies</td>
                          <td className="p-3 text-right font-semibold text-white">
                            ${invoiceData.suppliesCost.toFixed(2)}
                          </td>
                        </tr>
                      )}
                      <tr style={{ borderBottom: '1px solid #ECC94B' }}>
                        <td className="p-3 text-left font-semibold text-white">Materials Subtotal (incl. taxes)</td>
                        <td className="p-3 text-right font-semibold text-[#6A9955]">
                          ${(calculateMaterialCost() + invoiceData.suppliesCost).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-gray-400 mt-2 px-3">
                  * Materials already include taxes paid at purchase - no additional tax applied
                </div>
              </div>
            )}

            {/* Additional Workers Section - Blue (combined with Services & Labor) */}
            {additionalWorkers.filter((worker: any) => (parseFloat(worker.hours) || 0) > 0).length > 0 && (
              <div className="mb-6">
                <div className="p-4 rounded-t-lg" style={{ backgroundColor: '#3182CE' }}>
                  <h3 className="text-lg font-semibold text-white">Additional Workers</h3>
                </div>
                <div className="rounded-b-lg border-2 border-t-0" style={{ borderColor: '#3182CE', backgroundColor: '#2D3748' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#4A5568' }}>
                        <th className="p-3 text-left text-white font-semibold">Employee Name</th>
                        <th className="p-3 text-center text-white font-semibold">Hours</th>
                        <th className="p-3 text-center text-white font-semibold">Rate</th>
                        <th className="p-3 text-right text-white font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {additionalWorkers.filter((worker: any) => (parseFloat(worker.hours) || 0) > 0).map((worker: any, index: number) => {
                        const hours = parseFloat(worker.hours) || 0;
                        const rate = parseFloat(worker.rate) || 0;
                        const total = hours * rate;
                        const rowClass = index % 2 === 0 ? '' : 'bg-gray-700';
                        return (
                          <tr key={index} className={rowClass} style={{ borderBottom: '1px solid #3182CE' }}>
                            <td className="p-3 text-white">{worker.name || 'Additional Worker'}</td>
                            <td className="p-3 text-center text-white">{hours}h</td>
                            <td className="p-3 text-center text-white">${rate}/hr</td>
                            <td className="p-3 text-right font-semibold text-white">${total.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      <tr style={{ borderBottom: '1px solid #3182CE' }}>
                        <td className="p-3 text-left font-semibold text-white">Additional Workers Subtotal</td>
                        <td className="p-3"></td>
                        <td className="p-3"></td>
                        <td className="p-3 text-right font-semibold text-[#6A9955]">
                          ${additionalWorkersSubtotal.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Additional Services Section - Purple */}
            {additionalServices.filter((service: any) => (parseFloat(service.hours) || 0) > 0).length > 0 && (
              <div className="mb-6">
                <div className="p-4 rounded-t-lg" style={{ backgroundColor: '#8B5FBF' }}>
                  <h3 className="text-lg font-semibold text-white">Additional Services</h3>
                </div>
                <div className="rounded-b-lg border-2 border-t-0" style={{ borderColor: '#8B5FBF', backgroundColor: '#2D3748' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#4A5568' }}>
                        <th className="p-3 text-left text-white font-semibold">Service</th>
                        <th className="p-3 text-center text-white font-semibold">Hours</th>
                        <th className="p-3 text-center text-white font-semibold">Rate</th>
                        <th className="p-3 text-right text-white font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {additionalServices.filter((service: any) => (parseFloat(service.hours) || 0) > 0).map((service: any, index: number) => {
                        const hours = parseFloat(service.hours) || 0;
                        const rate = parseFloat(service.rate) || 0;
                        const total = hours * rate;
                        const rowClass = index % 2 === 0 ? '' : 'bg-gray-700';
                        return (
                          <tr key={index} className={rowClass} style={{ borderBottom: '1px solid #8B5FBF' }}>
                            <td className="p-3 text-white">{service.name}</td>
                            <td className="p-3 text-center text-white">{hours}h</td>
                            <td className="p-3 text-center text-white">${rate}/hr</td>
                            <td className="p-3 text-right font-semibold text-white">${total.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      <tr style={{ borderBottom: '1px solid #8B5FBF' }}>
                        <td className="p-3 text-left font-semibold text-white">Additional Services Subtotal</td>
                        <td className="p-3"></td>
                        <td className="p-3"></td>
                        <td className="p-3 text-right font-semibold text-[#6A9955]">
                          ${additionalServicesSubtotal.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Summary Section - Simplified for PDF */}
            <div className="mb-8 page-break-inside-avoid">
              <h3 className="text-2xl font-bold text-[#38A169] mb-4 border-b-2 pb-2" style={{ borderBottomColor: '#38A169' }}>Summary</h3>
              
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-white py-2">
                  <span>Labor Subtotal:</span>
                  <span>${dailyHours.reduce((sum, hourEntry) => sum + (hourEntry.hours * (project.hourlyRate || 60)), 0).toFixed(2)}</span>
                </div>
                {additionalServicesSubtotal > 0 && (
                  <div className="flex justify-between text-white py-2">
                    <span>Additional Services:</span>
                    <span>${additionalServicesSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {additionalWorkersSubtotal > 0 && (
                  <div className="flex justify-between text-white py-2">
                    <span>Additional Workers:</span>
                    <span>${additionalWorkersSubtotal.toFixed(2)}</span>
                  </div>
                )}
                {(calculateMaterialCost() + invoiceData.suppliesCost) > 0 && (
                  <div className="flex justify-between text-white py-2">
                    <span>Materials & Supplies:</span>
                    <span>${(calculateMaterialCost() + invoiceData.suppliesCost).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white py-2">
                  <span>Subtotal:</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white py-2">
                  <span>GST (5%):</span>
                  <span>${calculateGST().toFixed(2)}</span>
                </div>
                
                <div className="border-t-2 pt-4 mt-4" style={{ borderTopColor: '#38A169' }}>
                  <div className="flex justify-between text-2xl font-bold text-[#6A9955]">
                    <span>Total Amount:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section (if any) */}
            {invoiceData.notes && (
              <div className="mb-6">
                <div className="p-4 rounded-t-lg" style={{ backgroundColor: '#8B5FBF' }}>
                  <h3 className="text-lg font-semibold text-white">Notes & Payment Instructions</h3>
                </div>
                <div className="rounded-b-lg border-2 border-t-0 p-6" style={{ borderColor: '#8B5FBF', backgroundColor: '#2D3748' }}>
                  <p className="whitespace-pre-line text-white">{invoiceData.notes}</p>
                </div>
              </div>
            )}


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