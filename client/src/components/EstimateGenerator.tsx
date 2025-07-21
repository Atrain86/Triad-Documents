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
    pricePerGallon: '',
    gallons: '',
    coats: '1'
  });

  const [paintCosts, setPaintCosts] = useState({
    pricePerGallon: '',
    gallons: '',
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

  // Additional labor state
  const [additionalLabor, setAdditionalLabor] = useState([
    { name: '', hours: '', rate: '' }
  ]);

  // Tax configuration state
  const [taxConfig, setTaxConfig] = useState({
    country: 'CA',
    gst: 5,
    pst: 0,
    hst: 0,
    salesTax: 0,
    vat: 0,
    otherTax: 0
  });

  // Toggle state for action buttons
  const [actionMode, setActionMode] = useState<'download' | 'email'>('email');

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

  // Add new labor member
  const addLaborMember = () => {
    setAdditionalLabor([...additionalLabor, { name: '', hours: '', rate: '' }]);
  };

  // Remove labor member
  const removeLaborMember = (index: number) => {
    setAdditionalLabor(additionalLabor.filter((_, i) => i !== index));
  };

  // Update labor member
  const updateLaborMember = (index: number, field: string, value: string) => {
    const newLabor = [...additionalLabor];
    newLabor[index] = { ...newLabor[index], [field]: value };
    setAdditionalLabor(newLabor);
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
    const pricePerGallon = parseFloat(primerCosts.pricePerGallon) || 0;
    const gallons = parseFloat(primerCosts.gallons) || 0;
    return pricePerGallon * gallons;
  };

  const calculatePaintCosts = () => {
    const pricePerGallon = parseFloat(paintCosts.pricePerGallon) || 0;
    const gallons = parseFloat(paintCosts.gallons) || 0;
    return pricePerGallon * gallons;
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

  const calculateAdditionalLaborTotal = () => {
    return additionalLabor.reduce((sum, member) => {
      const hours = parseFloat(member.hours) || 0;
      const rate = parseFloat(member.rate) || 0;
      return sum + (hours * rate);
    }, 0);
  };

  const calculateLaborSubtotal = () => workStages.reduce((sum, stage) => sum + calculateStageTotal(stage), 0) + calculateAdditionalLaborTotal();
  const calculateMaterialsSubtotal = () => calculatePrimerCosts() + calculatePaintCosts() + calculateSuppliesTotal();
  const calculateSubtotal = () => calculateLaborSubtotal() + calculateMaterialsSubtotal() + calculateTravelTotal();
  
  const calculateTaxes = () => {
    const subtotal = calculateSubtotal();
    let totalTax = 0;
    
    if (taxConfig.country === 'CA') {
      totalTax += subtotal * ((taxConfig.gst || 0) / 100);
      totalTax += subtotal * ((taxConfig.pst || taxConfig.hst || 0) / 100);
    } else if (taxConfig.country === 'US') {
      totalTax += subtotal * ((taxConfig.salesTax || 0) / 100);
    } else if (taxConfig.country === 'OTHER') {
      totalTax += subtotal * ((taxConfig.vat || 0) / 100);
    }
    
    totalTax += subtotal * ((taxConfig.otherTax || 0) / 100);
    return totalTax;
  };
  
  const calculateTotal = () => calculateSubtotal() + calculateTaxes();

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
      // Temporarily show the hidden PDF template
      printRef.current.style.display = 'block';
      printRef.current.style.position = 'fixed';
      printRef.current.style.top = '-10000px';
      printRef.current.style.left = '-10000px';
      printRef.current.style.zIndex = '-1000';

      const canvas = await html2canvas(printRef.current, { 
        scale: 1, 
        backgroundColor: '#1a1a1a',
        useCORS: true,
        allowTaint: false
      });

      // Hide the template again
      printRef.current.style.display = 'none';
      printRef.current.style.position = '';
      printRef.current.style.top = '';
      printRef.current.style.left = '';
      printRef.current.style.zIndex = '';

      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
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
      // Temporarily show the hidden PDF template
      printRef.current!.style.display = 'block';
      printRef.current!.style.position = 'fixed';
      printRef.current!.style.top = '-10000px';
      printRef.current!.style.left = '-10000px';
      printRef.current!.style.zIndex = '-1000';

      // Generate PDF as blob with optimized settings
      const canvas = await html2canvas(printRef.current!, { 
        scale: 1, 
        backgroundColor: '#1a1a1a', 
        useCORS: true,
        allowTaint: false,
        logging: false
      });

      // Hide the template again
      printRef.current!.style.display = 'none';
      printRef.current!.style.position = '';
      printRef.current!.style.top = '';
      printRef.current!.style.left = '';
      printRef.current!.style.zIndex = '';
      
      // Validate canvas
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Failed to generate valid canvas');
      }
      
      const imgData = canvas.toDataURL('image/jpeg', 0.7);
      
      // Validate image data
      if (!imgData || imgData === 'data:,') {
        throw new Error('Failed to generate image data');
      }
      
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      // Get PDF as base64
      const pdfOutput = pdf.output('datauristring');
      if (!pdfOutput) {
        throw new Error('Failed to generate PDF output');
      }
      
      const pdfBase64 = pdfOutput.split(',')[1];
      
      // Validate base64 data size (should be reasonable for email)
      if (pdfBase64.length > 10000000) { // ~7.5MB base64 limit
        throw new Error('PDF too large for email. Please reduce content.');
      }

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
    } catch (error: any) {
      console.error('Email preparation failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send estimate email",
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
          <Card className="mb-4 border-2 border-[#FF6B6B]">
            <CardHeader>
              <CardTitle className="text-lg text-[#FF6B6B]">Client Information</CardTitle>
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
          <Card className="mb-4 border-2 border-[#D4A574]">
            <CardHeader>
              <CardTitle className="text-lg text-[#D4A574]">Estimate Details</CardTitle>
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
          <Card className="mb-4 border-2 border-[#DCDCAA]">
            <CardHeader className="flex justify-between items-center">
              <CardTitle className="text-lg text-[#DCDCAA]">Work Breakdown</CardTitle>
              <Button size="sm" onClick={addWorkStage} className="bg-[#DCDCAA] hover:bg-[#c4c193] text-black">+ Add Stage</Button>
            </CardHeader>
            <CardContent>
              {workStages.map((stage, i) => (
                <div
                  key={i}
                  className="mb-3 border-2 border-[#DCDCAA] bg-[#DCDCAA]/10 rounded p-3"
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

          {/* Additional Labor */}
          <Card className="mb-4 border-2 border-[#4ECDC4]">
            <CardHeader>
              <CardTitle className="text-lg text-[#4ECDC4]">Additional Labor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Crew Members</h4>
                <Button size="sm" onClick={addLaborMember} className="bg-[#4ECDC4] hover:bg-[#45b3b8] text-black">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Member
                </Button>
              </div>
              {additionalLabor.map((member, i) => (
                <div key={i} className="border border-[#4ECDC4] rounded p-3 mb-2 bg-[#4ECDC4]/10">
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <Input
                      placeholder="Name"
                      value={member.name}
                      onChange={(e) => updateLaborMember(i, 'name', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Hours"
                      value={member.hours}
                      onChange={(e) => updateLaborMember(i, 'hours', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Rate/hour"
                      value={member.rate}
                      onChange={(e) => updateLaborMember(i, 'rate', e.target.value)}
                    />
                    <Input
                      placeholder="Total"
                      value={((parseFloat(member.hours) || 0) * (parseFloat(member.rate) || 0)).toFixed(2)}
                      readOnly
                      className="bg-gray-100 dark:bg-gray-700"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeLaborMember(i)}
                    className="bg-[#E03E3E] hover:bg-[#c63535]"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
              <div className="text-right font-medium">
                Additional Labor Total: ${calculateAdditionalLaborTotal().toFixed(2)}
              </div>
            </CardContent>
          </Card>

          {/* Supply Costs */}
          <Card className="mb-4 border-2 border-[#6A9955]">
            <CardHeader>
              <CardTitle className="text-lg text-[#6A9955]">Supply Costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primer Costs */}
              <div className="border border-[#6A9955] rounded p-3 bg-[#6A9955]/10">
                <h4 className="font-medium mb-2">Primer</h4>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Price per gallon"
                    value={primerCosts.pricePerGallon}
                    onChange={(e) => setPrimerCosts({...primerCosts, pricePerGallon: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Gallons"
                    value={primerCosts.gallons}
                    onChange={(e) => setPrimerCosts({...primerCosts, gallons: e.target.value})}
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
              <div className="border border-[#6A9955] rounded p-3 bg-[#6A9955]/10">
                <h4 className="font-medium mb-2">Paint</h4>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="Price per gallon"
                    value={paintCosts.pricePerGallon}
                    onChange={(e) => setPaintCosts({...paintCosts, pricePerGallon: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Gallons"
                    value={paintCosts.gallons}
                    onChange={(e) => setPaintCosts({...paintCosts, gallons: e.target.value})}
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
          <Card className="mb-4 border-2 border-[#569CD6]">
            <CardHeader>
              <CardTitle className="text-lg text-[#569CD6]">Travel Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-[#569CD6] rounded p-3 bg-[#569CD6]/10">
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

          {/* Tax Configuration */}
          <Card className="mb-4 border-2 border-[#569CD6]">
            <CardHeader>
              <CardTitle className="text-lg text-[#569CD6]">Tax Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Country Selector */}
                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  <Select value={taxConfig.country} onValueChange={(value) => setTaxConfig({...taxConfig, country: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border border-gray-600">
                      <SelectItem value="CA" className="text-white hover:bg-gray-800">Canada</SelectItem>
                      <SelectItem value="US" className="text-white hover:bg-gray-800">United States</SelectItem>
                      <SelectItem value="OTHER" className="text-white hover:bg-gray-800">Other / International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Canadian Tax Fields */}
                {taxConfig.country === 'CA' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">GST (%)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="5"
                        value={taxConfig.gst || ''}
                        onChange={(e) => setTaxConfig({...taxConfig, gst: parseFloat(e.target.value) || 0})}
                      />
                      <small className="text-gray-500">Goods and Services Tax</small>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">PST/HST (%)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={taxConfig.pst || taxConfig.hst || ''}
                        onChange={(e) => setTaxConfig({...taxConfig, pst: parseFloat(e.target.value) || 0, hst: parseFloat(e.target.value) || 0})}
                      />
                      <small className="text-gray-500">Provincial/Harmonized Tax</small>
                    </div>
                  </div>
                )}

                {/* US Tax Fields */}
                {taxConfig.country === 'US' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Sales Tax (%)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={taxConfig.salesTax || ''}
                      onChange={(e) => setTaxConfig({...taxConfig, salesTax: parseFloat(e.target.value) || 0})}
                    />
                    <small className="text-gray-500">State and local sales taxes</small>
                  </div>
                )}

                {/* International Tax Fields */}
                {taxConfig.country === 'OTHER' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">VAT (%)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={taxConfig.vat || ''}
                      onChange={(e) => setTaxConfig({...taxConfig, vat: parseFloat(e.target.value) || 0})}
                    />
                    <small className="text-gray-500">Value Added Tax</small>
                  </div>
                )}

                {/* Other Tax Field - Always Show */}
                <div>
                  <label className="block text-sm font-medium mb-1">Other Tax/Fees (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={taxConfig.otherTax || ''}
                    onChange={(e) => setTaxConfig({...taxConfig, otherTax: parseFloat(e.target.value) || 0})}
                  />
                  <small className="text-gray-500">Any additional taxes or fees</small>
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
                    <span>Taxes:</span>
                    <span>${calculateTaxes().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Section - Inside scrollable content */}
          <Card className="mb-4 border-2 border-[#8B5FBF]">
            <CardHeader>
              <CardTitle className="text-lg text-[#8B5FBF]">Generate Estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Toggle Switch */}
                <div className="flex justify-center">
                  <div className="relative inline-flex items-center">
                    <button
                      onClick={() => setActionMode(actionMode === 'email' ? 'download' : 'email')}
                      className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        actionMode === 'email' ? 'bg-[#569CD6]' : 'bg-[#6A9955]'
                      }`}
                    >
                      <span
                        className={`inline-block h-10 w-10 transform rounded-full bg-white transition-transform duration-200 ${
                          actionMode === 'email' ? 'translate-x-1' : 'translate-x-[3.25rem]'
                        }`}
                      />
                      <Mail 
                        className={`absolute left-2 h-5 w-5 transition-opacity duration-200 ${
                          actionMode === 'email' ? 'text-white opacity-100' : 'text-white opacity-60'
                        }`} 
                        style={{ color: '#FFFFFF' }}
                      />
                      <Download 
                        className={`absolute right-2 h-5 w-5 transition-opacity duration-200 ${
                          actionMode === 'download' ? 'text-white opacity-100' : 'text-white opacity-60'
                        }`} 
                        style={{ color: '#FFFFFF' }}
                      />
                    </button>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose} className="flex-1 h-12">
                    Cancel
                  </Button>
                  
                  {actionMode === 'email' ? (
                    <Button 
                      onClick={sendEstimateEmail} 
                      className="bg-[#569CD6] hover:bg-[#4a8bc2] flex-1 h-12"
                      disabled={sendEmailMutation.isPending}
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
                    </Button>
                  ) : (
                    <Button onClick={generatePDF} className="bg-[#6A9955] hover:bg-[#5a8245] flex-1 h-12">
                      <Download className="w-5 h-5 mr-2" />
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
      
      {/* Hidden PDF Template - Dark Theme */}
      <div ref={printRef} className="hidden print:block">
        <div style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '32px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/aframe-logo.png" alt="A-Frame Painting" style={{ height: '60px', width: 'auto', marginRight: '16px' }} />
            </div>
            <div style={{ textAlign: 'right', color: 'white' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0', color: 'white' }}>ESTIMATE</h1>
              <p style={{ fontSize: '16px', margin: '0 0 4px 0', color: '#cccccc' }}>{estimateNumber || 'EST #'}</p>
              <p style={{ fontSize: '14px', margin: '0', color: '#cccccc' }}>{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Estimate For Section */}
          <div style={{ marginBottom: '24px', backgroundColor: '#2a2a2a', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0', color: 'white' }}>Estimate For:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', color: '#cccccc' }}>{clientName}</p>
                <p style={{ margin: '0 0 4px 0', color: '#cccccc' }}>{clientAddress}</p>
                <p style={{ margin: '0 0 4px 0', color: '#cccccc' }}>{clientCity}, {clientPostal}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', color: '#cccccc' }}>{clientEmail}</p>
                <p style={{ margin: '0 0 4px 0', color: '#cccccc' }}>{clientPhone}</p>
              </div>
            </div>
          </div>

          {/* Services & Labor */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0', color: 'white' }}>Services & Labor</h3>
            
            {/* Work Stages */}
            {workStages.filter(stage => parseFloat(String(stage.hours)) > 0).map((stage, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #333' }}>
                <div>
                  <p style={{ margin: '0', color: 'white', fontSize: '14px' }}>{stage.description}</p>
                  <p style={{ margin: '0', color: '#888', fontSize: '12px' }}>{stage.hours}h × ${stage.rate}</p>
                </div>
                <span style={{ color: 'white', fontSize: '14px' }}>${calculateStageTotal(stage).toFixed(2)}</span>
              </div>
            ))}

            {/* Additional Labor */}
            {additionalLabor.filter(member => member.name && parseFloat(String(member.hours)) > 0).map((member, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #333' }}>
                <div>
                  <p style={{ margin: '0', color: 'white', fontSize: '14px' }}>{member.name}</p>
                  <p style={{ margin: '0', color: '#888', fontSize: '12px' }}>{member.hours}h × ${member.rate}</p>
                </div>
                <span style={{ color: 'white', fontSize: '14px' }}>${((parseFloat(String(member.hours)) || 0) * (parseFloat(String(member.rate)) || 0)).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Additional Labor */}
          {additionalLabor.some(member => member.name && parseFloat(String(member.hours)) > 0) && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0', color: 'white' }}>Additional Services</h3>
              {additionalLabor.filter(member => member.name && parseFloat(String(member.hours)) > 0).map((member, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #333' }}>
                  <div>
                    <span style={{ color: 'white', fontSize: '14px' }}>{member.name}</span>
                    <p style={{ margin: '0', color: '#888', fontSize: '12px' }}>{member.hours}h × ${member.rate}</p>
                  </div>
                  <span style={{ color: 'white', fontSize: '14px' }}>${((parseFloat(String(member.hours)) || 0) * (parseFloat(String(member.rate)) || 0)).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Materials & Paint */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0', color: 'white' }}>Materials & Paint</h3>
            
            {/* Paint & Supplies */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #333' }}>
              <span style={{ color: 'white', fontSize: '14px' }}>Paint & Supplies</span>
              <span style={{ color: 'white', fontSize: '14px' }}>${(calculatePrimerCosts() + calculatePaintCosts() + calculateSuppliesTotal()).toFixed(2)}</span>
            </div>
            
            {/* Delivery */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ color: 'white', fontSize: '14px' }}>Delivery</span>
              <span style={{ color: 'white', fontSize: '14px' }}>${calculateTravelTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Summary */}
          <div style={{ backgroundColor: '#2a2a2a', padding: '16px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'white' }}>Subtotal:</span>
              <span style={{ color: 'white' }}>${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'white' }}>Paint & Materials:</span>
              <span style={{ color: 'white' }}>${(calculatePrimerCosts() + calculatePaintCosts() + calculateSuppliesTotal()).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '2px solid #059669' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>Total Estimate:</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', backgroundColor: '#059669', color: 'white', padding: '4px 12px', borderRadius: '4px' }}>${calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '32px', textAlign: 'center', padding: '16px', backgroundColor: '#2a2a2a', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 8px 0', color: 'white', fontSize: '16px', fontWeight: 'bold' }}>Thank you for considering A-Frame Painting!</p>
            <p style={{ margin: '0 0 8px 0', color: '#cccccc', fontSize: '14px' }}>884 Hayes Rd, Manson's Landing, BC V0P1K0</p>
            <p style={{ margin: '0', color: '#cccccc', fontSize: '14px' }}>This estimate is valid for 30 days from the date above.</p>
          </div>
        </div>
      </div>
    </Dialog>
  );
}