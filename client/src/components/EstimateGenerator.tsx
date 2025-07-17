import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Download, Mail, Plus, Trash2 } from 'lucide-react';
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

  // Paint costs state
  const [primerCosts, setPrimerCosts] = useState({
    price: '',
    coats: '1'
  });

  const [paintCosts, setPaintCosts] = useState({
    price: '',
    coats: '2'
  });

  const [supplies, setSupplies] = useState([
    { name: 'Tape', unitCost: '', quantity: '', total: 0 },
    { name: 'Brushes', unitCost: '', quantity: '', total: 0 },
    { name: 'Rollers', unitCost: '', quantity: '', total: 0 }
  ]);

  // Travel costs state
  const [travelCosts, setTravelCosts] = useState({
    ratePerKm: '0.50',
    distance: '',
    trips: '2'
  });

  // Toggle state for action buttons
  const [actionMode, setActionMode] = useState<'download' | 'email'>('download');

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

  // Add new supply item
  const addSupply = () => {
    setSupplies([...supplies, { name: '', unitCost: '', quantity: '', total: 0 }]);
  };

  // Remove supply item
  const removeSupply = (index: number) => {
    setSupplies(supplies.filter((_, i) => i !== index));
  };

  // Update supply item
  const updateSupply = (index: number, field: string, value: string) => {
    const newSupplies = [...supplies];
    newSupplies[index] = { ...newSupplies[index], [field]: value };
    
    if (field === 'unitCost' || field === 'quantity') {
      const unitCost = parseFloat(newSupplies[index].unitCost) || 0;
      const quantity = parseFloat(newSupplies[index].quantity) || 0;
      newSupplies[index].total = unitCost * quantity;
    }
    
    setSupplies(newSupplies);
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

  const calculatePrimerCosts = () => {
    const price = parseFloat(primerCosts.price) || 0;
    const coats = parseInt(primerCosts.coats) || 0;
    return price * coats;
  };

  const calculatePaintCosts = () => {
    const price = parseFloat(paintCosts.price) || 0;
    const coats = parseInt(paintCosts.coats) || 0;
    return price * coats;
  };

  const calculateSuppliesTotal = () => {
    return supplies.reduce((sum, supply) => sum + supply.total, 0);
  };

  const calculateTravelTotal = () => {
    const ratePerKm = parseFloat(travelCosts.ratePerKm) || 0;
    const distance = parseFloat(travelCosts.distance) || 0;
    const trips = parseFloat(travelCosts.trips) || 0;
    return ratePerKm * distance * trips;
  };

  const calculateLaborSubtotal = () => workStages.reduce((sum, stage) => sum + calculateStageTotal(stage), 0);
  const calculateMaterialsSubtotal = () => calculatePrimerCosts() + calculatePaintCosts() + calculateSuppliesTotal();
  const calculateSubtotal = () => calculateLaborSubtotal() + calculateMaterialsSubtotal() + calculateTravelTotal();
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
          <Card className="mb-4 border-2 border-[#D4A574]">
            <CardHeader>
              <CardTitle className="text-lg text-[#D4A574]">Client Information</CardTitle>
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
          <Card className="mb-4 border-2 border-[#569CD6]">
            <CardHeader>
              <CardTitle className="text-lg text-[#569CD6]">Estimate Details</CardTitle>
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
          <Card className="mb-4 border-2 border-[#6A9955]">
            <CardHeader className="flex justify-between items-center">
              <CardTitle className="text-lg text-[#6A9955]">Work Breakdown</CardTitle>
              <Button size="sm" onClick={addWorkStage} className="bg-[#6A9955] hover:bg-[#5a8245]">+ Add Stage</Button>
            </CardHeader>
            <CardContent>
              {workStages.map((stage, i) => (
                <div
                  key={i}
                  className="mb-3 border-2 border-[#6A9955] bg-[#6A9955]/10 rounded p-3"
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
                    className="mt-2 bg-[#E03E3E] hover:bg-[#c63535]"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Supply Costs */}
          <Card className="mb-4 border-2 border-[#DCDCAA]">
            <CardHeader>
              <CardTitle className="text-lg text-[#DCDCAA]">Supply Costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primer Costs */}
              <div className="border border-[#DCDCAA] rounded p-3 bg-[#DCDCAA]/10">
                <h4 className="font-medium mb-2">Primer</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Price"
                    value={primerCosts.price}
                    onChange={(e) => setPrimerCosts({...primerCosts, price: e.target.value})}
                  />
                  <Select value={primerCosts.coats} onValueChange={(value) => setPrimerCosts({...primerCosts, coats: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Coats" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border border-gray-600">
                      <SelectItem value="0" className="text-white hover:bg-gray-800">0 coats</SelectItem>
                      <SelectItem value="1" className="text-white hover:bg-gray-800">1 coat</SelectItem>
                      <SelectItem value="2" className="text-white hover:bg-gray-800">2 coats</SelectItem>
                      <SelectItem value="3" className="text-white hover:bg-gray-800">3 coats</SelectItem>
                      <SelectItem value="4" className="text-white hover:bg-gray-800">4 coats</SelectItem>
                      <SelectItem value="5" className="text-white hover:bg-gray-800">5 coats</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-2 text-right font-medium">
                  Primer Total: ${calculatePrimerCosts().toFixed(2)}
                </div>
              </div>

              {/* Paint Costs */}
              <div className="border border-[#DCDCAA] rounded p-3 bg-[#DCDCAA]/10">
                <h4 className="font-medium mb-2">Paint</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Price"
                    value={paintCosts.price}
                    onChange={(e) => setPaintCosts({...paintCosts, price: e.target.value})}
                  />
                  <Select value={paintCosts.coats} onValueChange={(value) => setPaintCosts({...paintCosts, coats: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Coats" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border border-gray-600">
                      <SelectItem value="1" className="text-white hover:bg-gray-800">1 coat</SelectItem>
                      <SelectItem value="2" className="text-white hover:bg-gray-800">2 coats</SelectItem>
                      <SelectItem value="3" className="text-white hover:bg-gray-800">3 coats</SelectItem>
                      <SelectItem value="4" className="text-white hover:bg-gray-800">4 coats</SelectItem>
                      <SelectItem value="5" className="text-white hover:bg-gray-800">5 coats</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-2 text-right font-medium">
                  Paint Total: ${calculatePaintCosts().toFixed(2)}
                </div>
              </div>

              {/* Other Supplies */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Other Supplies</h4>
                  <Button size="sm" onClick={addSupply} className="bg-[#DCDCAA] hover:bg-[#c5c593] text-black">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Supply
                  </Button>
                </div>
                {supplies.map((supply, i) => (
                  <div key={i} className="border border-[#DCDCAA] rounded p-3 mb-2 bg-[#DCDCAA]/10">
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <Input
                        placeholder="Item name"
                        value={supply.name}
                        onChange={(e) => updateSupply(i, 'name', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        value={supply.unitCost}
                        onChange={(e) => updateSupply(i, 'unitCost', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Quantity"
                        value={supply.quantity}
                        onChange={(e) => updateSupply(i, 'quantity', e.target.value)}
                      />
                      <Input
                        placeholder="Total"
                        value={supply.total.toFixed(2)}
                        readOnly
                        className="bg-gray-100 dark:bg-gray-700"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeSupply(i)}
                      className="bg-[#E03E3E] hover:bg-[#c63535]"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ))}
                <div className="text-right font-medium">
                  Supplies Total: ${calculateSuppliesTotal().toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Travel Costs */}
          <Card className="mb-4 border-2 border-[#FF6B6B]">
            <CardHeader>
              <CardTitle className="text-lg text-[#FF6B6B]">Travel Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-[#FF6B6B] rounded p-3 bg-[#FF6B6B]/10">
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Rate per km"
                    value={travelCosts.ratePerKm}
                    onChange={(e) => setTravelCosts({...travelCosts, ratePerKm: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Distance (km)"
                    value={travelCosts.distance}
                    onChange={(e) => setTravelCosts({...travelCosts, distance: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Number of trips"
                    value={travelCosts.trips}
                    onChange={(e) => setTravelCosts({...travelCosts, trips: e.target.value})}
                  />
                </div>
                <div className="mt-2 text-right font-medium">
                  Travel Total: ${calculateTravelTotal().toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="mb-4 border-2 border-[#8B5FBF]">
            <CardHeader>
              <CardTitle className="text-lg text-[#8B5FBF]">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Labor:</span>
                  <span>${calculateLaborSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Materials:</span>
                  <span>${calculateMaterialsSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Travel:</span>
                  <span>${calculateTravelTotal().toFixed(2)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%):</span>
                    <span>${calculateGST().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Toggle and Buttons */}
        <div className="mt-4 space-y-3">
          {/* Toggle Switch */}
          <div className="flex justify-center">
            <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setActionMode('download')}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  actionMode === 'download'
                    ? 'bg-[#6A9955] text-white'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
              <button
                onClick={() => setActionMode('email')}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  actionMode === 'email'
                    ? 'bg-[#569CD6] text-white'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            {actionMode === 'download' ? (
              <Button onClick={generatePDF} className="flex-1 bg-[#6A9955] hover:bg-[#5a8245]">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            ) : (
              <Button 
                onClick={sendEstimateEmail} 
                className="flex-1 bg-[#569CD6] hover:bg-[#4a8bc2]"
                disabled={sendEmailMutation.isPending}
              >
                <Mail className="w-4 h-4 mr-2" />
                {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}