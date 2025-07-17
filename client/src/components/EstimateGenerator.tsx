import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface EstimateGeneratorProps {
  project: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function EstimateGenerator({ project, isOpen, onClose }: EstimateGeneratorProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [estimateNumber, setEstimateNumber] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState(project?.notes || '');

  // Auto-populated client info from project
  const clientName = project?.clientName || '';
  const clientEmail = project?.clientEmail || '';
  const clientAddress = project?.address || '';
  const clientCity = project?.clientCity || '';
  const clientPostal = project?.clientPostal || '';
  const clientPhone = project?.clientPhone || '';

  // Example work stages state
  const [workStages, setWorkStages] = useState([
    { name: 'Prep', description: '', hours: '', rate: 60 },
    { name: 'Priming', description: '', hours: '', rate: 60 },
    { name: 'Painting', description: '', hours: '', rate: 60 },
  ]);

  // Handle input changes for work stages
  const updateWorkStage = (index: number, field: string, value: string | number) => {
    const newStages = [...workStages];
    newStages[index] = { ...newStages[index], [field]: value };
    setWorkStages(newStages);
  };

  // Add new work stage
  const addWorkStage = () => {
    setWorkStages([...workStages, { name: '', description: '', hours: '', rate: 60 }]);
  };

  // Remove work stage
  const removeWorkStage = (index: number) => {
    setWorkStages(workStages.filter((_, i) => i !== index));
  };

  // Calculate totals
  const calculateStageTotal = (stage: typeof workStages[0]) => {
    const hours = typeof stage.hours === 'string' ? parseFloat(stage.hours) || 0 : stage.hours;
    return hours * stage.rate;
  };
  const calculateSubtotal = () => workStages.reduce((sum, stage) => sum + calculateStageTotal(stage), 0);
  const calculateGST = () => calculateSubtotal() * 0.05;
  const calculateTotal = () => calculateSubtotal() + calculateGST();

  // Email sending functionality
  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: any) => {
      const response = await fetch('/api/send-estimate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email sent successfully!",
        description: "The estimate has been sent to your client.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Email failed",
        description: error.message || "Failed to send estimate email. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Generate PDF (basic)
  const generatePDF = async () => {
    if (!printRef.current) return;

    try {
      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#fff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Estimate-${estimateNumber || 'unknown'}.pdf`);

      toast({
        title: 'PDF Generated',
        description: 'Estimate PDF has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate PDF.',
        variant: 'destructive',
      });
    }
  };

  // Generate PDF and send email
  const sendEstimateEmail = async () => {
    if (!clientEmail || !clientEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please add client email to send estimate",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate PDF as blob
      const canvas = await html2canvas(printRef.current!, { scale: 2, backgroundColor: '#fff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      const emailData = {
        recipientEmail: clientEmail,
        clientName: clientName || 'Client',
        estimateNumber: estimateNumber || 'EST-001',
        projectTitle: projectTitle || 'Painting Estimate',
        totalAmount: calculateTotal().toFixed(2),
        customMessage: '',
        pdfData: pdfBase64
      };

      await sendEmailMutation.mutateAsync(emailData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send estimate email",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-screen max-w-md h-screen p-4 sm:max-w-3xl sm:h-auto overflow-hidden"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold mb-4">Generate Estimate</DialogTitle>
        </DialogHeader>

        <div
          ref={printRef}
          className="overflow-y-auto max-h-[calc(100vh-160px)] pr-2"
        >
          {/* Client Info (read-only) */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input value={clientName} readOnly placeholder="Client Name" />
              <Input value={clientEmail} readOnly placeholder="Client Email" />
              <Input value={clientAddress} readOnly placeholder="Client Address" />
              <Input value={clientCity} readOnly placeholder="City" />
              <Input value={clientPostal} readOnly placeholder="Postal Code" />
              <Input value={clientPhone} readOnly placeholder="Phone" />
            </CardContent>
          </Card>

          {/* Estimate Details */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Estimate Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="Estimate Number"
                value={estimateNumber}
                onChange={(e) => setEstimateNumber(e.target.value)}
              />
              <Input
                type="date"
                value={new Date().toISOString().split('T')[0]}
                readOnly
              />
              <Input
                placeholder="Project Title"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
              />
              <Textarea
                placeholder="Project Description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Work Stages */}
          <Card className="mb-4">
            <CardHeader className="flex justify-between items-center">
              <CardTitle className="text-lg">Work Breakdown</CardTitle>
              <Button size="sm" onClick={addWorkStage}>+ Add Stage</Button>
            </CardHeader>
            <CardContent>
              {workStages.map((stage, i) => (
                <div
                  key={i}
                  className="mb-3 border border-gray-300 rounded p-3"
                >
                  <Input
                    placeholder="Stage Name"
                    value={stage.name}
                    onChange={(e) => updateWorkStage(i, 'name', e.target.value)}
                    className="mb-1"
                  />
                  <Textarea
                    placeholder="Description"
                    value={stage.description}
                    onChange={(e) => updateWorkStage(i, 'description', e.target.value)}
                    className="mb-1"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Hours"
                      value={stage.hours}
                      onChange={(e) => updateWorkStage(i, 'hours', e.target.value)}
                      className="flex-1"
                      min={0}
                    />
                    <Input
                      type="number"
                      placeholder="Rate"
                      value={stage.rate}
                      onChange={(e) => updateWorkStage(i, 'rate', Number(e.target.value))}
                      className="flex-1"
                      min={0}
                    />
                    <Input
                      placeholder="Total"
                      value={calculateStageTotal(stage).toFixed(2)}
                      readOnly
                      className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeWorkStage(i)}
                    className="mt-2"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-1">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>GST (5%):</span>
                <span>${calculateGST().toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Buttons */}
        <div className="flex justify-between gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={generatePDF} className="flex-1">Download PDF</Button>
          <Button 
            onClick={sendEstimateEmail} 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={sendEmailMutation.isPending}
          >
            {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}