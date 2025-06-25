import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Receipt as ReceiptIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Receipt } from "@shared/schema";
import { uploadReceipt } from "@/lib/api";

interface ReceiptListProps {
  projectId: number;
}

export default function ReceiptList({ projectId }: ReceiptListProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    vendor: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: receipts = [], isLoading } = useQuery<Receipt[]>({
    queryKey: ['/api/projects', projectId, 'receipts'],
  });

  const addReceiptMutation = useMutation({
    mutationFn: async () => {
      return uploadReceipt(projectId, {
        vendor: formData.vendor,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        date: new Date(formData.date),
        file: selectedFile || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'receipts'] });
      toast({
        title: "Success",
        description: "Receipt added successfully.",
      });
      setFormData({
        vendor: "",
        amount: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
      });
      setSelectedFile(null);
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add receipt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.vendor || !formData.amount || !formData.date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    addReceiptMutation.mutate();
  };

  const totalCost = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);

  if (isLoading) {
    return <div className="text-center text-gray-500">Loading receipts...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Material Receipts</h3>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Cost</p>
            <p className="text-xl font-bold text-gray-900">${totalCost.toFixed(2)}</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Receipt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Receipt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="vendor">Vendor *</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="e.g., Home Depot"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="127.89"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Paint & Brushes"
                    className="mt-1"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="receipt-file">Receipt Image (optional)</Label>
                  <Input
                    id="receipt-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={addReceiptMutation.isPending}
                  >
                    {addReceiptMutation.isPending ? "Adding..." : "Add Receipt"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {receipts.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <ReceiptIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>No receipts added yet. Click "Add Receipt" to get started.</p>
          </div>
        ) : (
          receipts.map((receipt) => (
            <Card key={receipt.id} className="bg-gray-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 flex items-center justify-center mr-4">
                      <ReceiptIcon className="text-gray-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{receipt.vendor}</h4>
                      <p className="text-sm text-gray-500">
                        {new Date(receipt.date).toLocaleDateString()}
                      </p>
                      {receipt.description && (
                        <p className="text-sm text-gray-600">{receipt.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${receipt.amount.toFixed(2)}</p>
                    {receipt.filename && (
                      <Button
                        variant="link"
                        size="sm"
                        className="text-xs text-primary hover:text-blue-700 mt-1 p-0"
                        onClick={() => {
                          window.open(`/uploads/${receipt.filename}`, '_blank');
                        }}
                      >
                        View Receipt
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
