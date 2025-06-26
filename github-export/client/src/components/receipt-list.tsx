import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt as ReceiptIcon, FileText, DollarSign, Calendar } from "lucide-react";
import type { Receipt } from "@shared/schema";
import ReceiptUpload from "./receipt-upload";

interface ReceiptListProps {
  projectId: number;
}

export default function ReceiptList({ projectId }: ReceiptListProps) {
  const { data: receipts = [], isLoading } = useQuery<Receipt[]>({
    queryKey: ['/api/projects', projectId, 'receipts'],
  });

  if (isLoading) {
    return <div className="text-center text-gray-500 dark:text-gray-400">Loading receipts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Receipt Upload */}
      <ReceiptUpload projectId={projectId} />
      
      {/* Total Summary */}
      {receipts.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900 dark:text-white">Total Expenses</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ${receipts.reduce((sum, receipt) => {
                  const amount = typeof receipt.amount === 'string' ? parseFloat(receipt.amount) : receipt.amount;
                  return sum + amount;
                }, 0).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Receipt List */}
      {receipts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Receipts</h3>
          <div className="grid gap-4">
            {receipts.map((receipt) => (
              <Card key={receipt.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <ReceiptIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{receipt.vendor}</h4>
                        {receipt.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{receipt.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(receipt.date).toLocaleDateString()}
                          </div>
                          {receipt.filename && (
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 mr-1" />
                              <a 
                                href={`/uploads/${receipt.filename}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                View Receipt
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                        <DollarSign className="w-5 h-5" />
                        {typeof receipt.amount === 'string' ? parseFloat(receipt.amount).toFixed(2) : receipt.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Total */}
          <Card className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900 dark:text-white">Total Expenses</span>
                <div className="flex items-center text-xl font-bold text-gray-900 dark:text-white">
                  <DollarSign className="w-6 h-6" />
                  {receipts.reduce((sum, receipt) => {
                    const amount = typeof receipt.amount === 'string' ? parseFloat(receipt.amount) : receipt.amount;
                    return sum + amount;
                  }, 0).toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {receipts.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No receipts added yet. Use the scanner above to add your first receipt.
        </div>
      )}
    </div>
  );
}