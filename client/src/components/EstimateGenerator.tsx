import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Download, Mail } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { apiRequest } from '@/lib/queryClient';
import type { Project } from '@shared/schema';

interface EstimateGeneratorProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export default function EstimateGenerator({ project, isOpen, onClose }: EstimateGeneratorProps) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [estimateNumber, setEstimateNumber] = useState('EST-001');
  const [projectTitle, setProjectTitle] = useState(project?.notes || '');
  const [laborHours, setLaborHours] = useState('');
  const [laborRate, setLaborRate] = useState('60');
  const [materialCost, setMaterialCost] = useState('');

  // Calculate totals
  const laborTotal = (parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0);
  const materials = parseFloat(materialCost) || 0;
  const subtotal = laborTotal + materials;
  const tax = subtotal * 0.12; // 12% tax
  const total = subtotal + tax;

  // Email mutation
  const emailMutation = useMutation({
    mutationFn: async (pdfData: string) => {
      const pdfBase64 = pdfData.includes(',') ? pdfData.split(',')[1] : pdfData;
      
      const response = await apiRequest('/api/send-estimate-email', {
        method: 'POST',
        body: JSON.stringify({
          recipientEmail: project.clientEmail,
          clientName: project.clientName || 'Client',
          estimateNumber,
          projectTitle,
          totalAmount: total.toFixed(2),
          customMessage: '',
          pdfData: pdfBase64
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send estimate email');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Estimate Sent!",
        description: `Estimate sent to ${project.clientEmail}`,
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send estimate",
        variant: "destructive",
      });
    },
  });

  const generatePDF = async (sendEmail = false) => {
    if (!printRef.current) return;

    try {
      const canvas = await html2canvas(printRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
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

      if (sendEmail) {
        const pdfData = pdf.output('datauristring');
        emailMutation.mutate(pdfData);
      } else {
        pdf.save(`estimate-${estimateNumber}.pdf`);
        toast({
          title: "PDF Generated!",
          description: "Estimate downloaded successfully",
        });
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] bg-gray-900 border-gray-700 text-white overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-[#8B5FBF]">
            Generate Estimate
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {/* Basic Info */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-[#569CD6]">Estimate Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Estimate Number</label>
                  <Input
                    value={estimateNumber}
                    onChange={(e) => setEstimateNumber(e.target.value)}
                    placeholder="EST-001"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Project Title</label>
                  <Input
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Enter project title"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Labor */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-[#EA580C]">Labor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Hours</label>
                  <Input
                    type="number"
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                    placeholder="0"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Rate/Hour</label>
                  <Input
                    type="number"
                    value={laborRate}
                    onChange={(e) => setLaborRate(e.target.value)}
                    placeholder="60"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Total</label>
                  <div className="text-[#6A9955] font-semibold text-lg">${laborTotal.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Materials */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-[#3182CE]">Materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Material Cost</label>
                <Input
                  type="number"
                  value={materialCost}
                  onChange={(e) => setMaterialCost(e.target.value)}
                  placeholder="0"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-[#569CD6]">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Labor:</span>
                <span>${laborTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Materials:</span>
                <span>${materials.toFixed(2)}</span>
              </div>
              <hr className="border-gray-600" />
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (12%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <hr className="border-gray-600" />
              <div className="flex justify-between text-xl font-bold text-[#6A9955]">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button 
              onClick={onClose}
              variant="outline" 
              className="bg-gray-700 border-gray-600 text-white"
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button 
                onClick={() => generatePDF(false)}
                className="bg-[#8B5FBF] hover:bg-[#8B5FBF]/80"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button 
                onClick={() => generatePDF(true)}
                className="bg-[#EA580C] hover:bg-[#EA580C]/80"
                disabled={emailMutation.isPending}
              >
                {emailMutation.isPending ? (
                  'Sending...'
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Hidden PDF Template */}
        <div 
          ref={printRef} 
          className="fixed -left-[9999px] w-[210mm] bg-white p-8 text-black"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          <div className="text-center mb-8">
            <img 
              src="/aframe-logo.png" 
              alt="A-Frame Logo" 
              className="mx-auto mb-4 h-12"
            />
            <h1 className="text-3xl font-bold">ESTIMATE</h1>
          </div>

          <div className="flex justify-between mb-6">
            <div>
              <p><strong>Estimate #:</strong> {estimateNumber}</p>
              <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">From:</h3>
              <p>A-Frame Painting</p>
              <p>Professional Painting Services</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">To:</h3>
              <p>{project.clientName}</p>
              <p>{project.clientEmail}</p>
              <p>{project.address}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Project: {projectTitle}</h3>
          </div>

          <table className="w-full mb-6 border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Description</th>
                <th className="border border-gray-300 p-2 text-right">Hours</th>
                <th className="border border-gray-300 p-2 text-right">Rate</th>
                <th className="border border-gray-300 p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2">Labor</td>
                <td className="border border-gray-300 p-2 text-right">{laborHours}</td>
                <td className="border border-gray-300 p-2 text-right">${laborRate}</td>
                <td className="border border-gray-300 p-2 text-right">${laborTotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2">Materials</td>
                <td className="border border-gray-300 p-2 text-right">-</td>
                <td className="border border-gray-300 p-2 text-right">-</td>
                <td className="border border-gray-300 p-2 text-right">${materials.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="text-right">
            <div className="mb-2">
              <span className="mr-4">Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="mb-2">
              <span className="mr-4">Tax (12%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="text-xl font-bold">
              <span className="mr-4">Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center mt-8 text-gray-600">
            <p>Thank you for considering A-Frame Painting!</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}