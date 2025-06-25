import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Upload, FileText, Scan, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadReceipt } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ReceiptScannerProps {
  projectId: number;
  onSuccess?: () => void;
}

export default function ReceiptScanner({ projectId, onSuccess }: ReceiptScannerProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (data: {
      vendor: string;
      amount: number;
      description: string;
      date: Date;
      file?: File;
    }) => {
      return uploadReceipt(projectId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      toast({
        title: "Receipt Added",
        description: "Receipt has been successfully uploaded.",
      });
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload receipt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setSelectedFile(null);
    setVendor("");
    setAmount("");
    setDescription("");
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setShowForm(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || !amount) {
      toast({
        title: "Missing Information",
        description: "Please fill in vendor and amount fields.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({
      vendor,
      amount: parseFloat(amount),
      description,
      date: new Date(date),
      file: selectedFile || undefined,
    });
  };

  if (showForm) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Receipt Details</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetForm}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {selectedFile && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{selectedFile.name}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor" className="text-gray-700 dark:text-gray-300">
                  Vendor *
                </Label>
                <Input
                  id="vendor"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="Home Depot, Sherwin Williams..."
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  required
                />
              </div>

              <div>
                <Label htmlFor="amount" className="text-gray-700 dark:text-gray-300">
                  Amount *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="date" className="text-gray-700 dark:text-gray-300">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paint supplies, brushes, etc..."
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                type="submit"
                disabled={uploadMutation.isPending}
                className="flex-1"
              >
                {uploadMutation.isPending ? "Saving..." : "Save Receipt"}
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardContent className="p-6">
        <div className="text-center">
          <Scan className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Add Receipt</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Scan or upload receipt images</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={() => cameraInputRef.current?.click()}
              className="h-20 flex-col space-y-2"
            >
              <Camera className="w-8 h-8" />
              <span className="text-sm">Scan Receipt</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-20 flex-col space-y-2 border-gray-200 dark:border-gray-700"
            >
              <Upload className="w-8 h-8" />
              <span className="text-sm">Upload File</span>
            </Button>
          </div>

          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowForm(true)}
              className="text-sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Enter Manually
            </Button>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}