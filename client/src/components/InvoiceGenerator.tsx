import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, Send } from 'lucide-react';
import type { Project, DailyHours, Receipt } from '@shared/schema';

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
  const [suppliesCost, setSuppliesCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  // Calculate totals
  const totalHours = dailyHours.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  const laborCost = totalHours * (project.hourlyRate || 60);
  const receiptTotal = receipts.reduce((sum, receipt) => sum + (parseFloat(receipt.amount) || 0), 0);
  const subtotal = laborCost + suppliesCost + receiptTotal;
  const taxRate = 0.0875; // 8.75% tax
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  const handleDownloadPDF = async () => {
    setSending(true);
    try {
      const invoiceEl = document.getElementById('invoice-preview');
      if (!invoiceEl) throw new Error('Invoice preview not found');

      const canvas = await html2canvas(invoiceEl, { 
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      const width = imgWidth * ratio;
      const height = imgHeight * ratio;

      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`invoice-${project.clientName?.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error generating PDF: ' + (err as Error).message);
    }
    setSending(false);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={20} />
            Generate Invoice - {project.clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <label className="text-sm font-medium mb-2 block">Additional Supplies Cost</label>
              <Input
                type="number"
                step="0.01"
                value={suppliesCost}
                onChange={(e) => setSuppliesCost(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Invoice Notes</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Thank you for your business!"
              />
            </div>
          </div>

          {/* Invoice Preview */}
          <Card className="p-0">
            <div id="invoice-preview" className="p-8 bg-white text-black">
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <img 
                    src="/aframe-logo.png" 
                    alt="A-Frame Painting" 
                    className="h-12 w-auto object-contain mb-2"
                  />
                  <p className="text-gray-600">Professional Painting Services</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-semibold text-gray-800">INVOICE</h2>
                  <p className="text-gray-600">Date: {formatDate(new Date())}</p>
                  <p className="text-gray-600">Invoice #: {project.id.toString().padStart(4, '0')}</p>
                </div>
              </div>

              {/* Client Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Bill To:</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="font-medium text-lg">{project.clientName}</p>
                  <p className="text-gray-600">{project.address}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Project Type: {project.projectType} • Difficulty: {project.difficulty}
                  </p>
                </div>
              </div>

              {/* Labor Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Labor</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-3 text-left">Date</th>
                        <th className="border border-gray-300 p-3 text-left">Description</th>
                        <th className="border border-gray-300 p-3 text-center">Hours</th>
                        <th className="border border-gray-300 p-3 text-center">Rate</th>
                        <th className="border border-gray-300 p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyHours.map((entry, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 p-3">
                            {formatDate(new Date(entry.date))}
                          </td>
                          <td className="border border-gray-300 p-3">
                            {entry.description || 'Painting work'}
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            {entry.hours}
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            {formatCurrency(project.hourlyRate || 60)}
                          </td>
                          <td className="border border-gray-300 p-3 text-right">
                            {formatCurrency((entry.hours || 0) * (project.hourlyRate || 60))}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-medium">
                        <td colSpan={4} className="border border-gray-300 p-3 text-right">
                          Labor Subtotal:
                        </td>
                        <td className="border border-gray-300 p-3 text-right">
                          {formatCurrency(laborCost)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Materials/Receipts Section */}
              {receipts.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">Materials & Expenses</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-3 text-left">Date</th>
                          <th className="border border-gray-300 p-3 text-left">Vendor</th>
                          <th className="border border-gray-300 p-3 text-left">Description</th>
                          <th className="border border-gray-300 p-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receipts.map((receipt, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 p-3">
                              {formatDate(new Date(receipt.date))}
                            </td>
                            <td className="border border-gray-300 p-3">
                              {receipt.vendor || 'N/A'}
                            </td>
                            <td className="border border-gray-300 p-3">
                              {receipt.description || 'Material expense'}
                            </td>
                            <td className="border border-gray-300 p-3 text-right">
                              {formatCurrency(parseFloat(receipt.amount) || 0)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-medium">
                          <td colSpan={3} className="border border-gray-300 p-3 text-right">
                            Materials Subtotal:
                          </td>
                          <td className="border border-gray-300 p-3 text-right">
                            {formatCurrency(receiptTotal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Additional Supplies */}
              {suppliesCost > 0 && (
                <div className="mb-6">
                  <div className="border border-gray-300 p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Additional Supplies</span>
                      <span className="font-medium">{formatCurrency(suppliesCost)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoice Total */}
              <div className="border-t-2 border-gray-400 pt-4">
                <div className="flex justify-end">
                  <div className="w-80">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Tax ({(taxRate * 100).toFixed(2)}%):</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {notes && (
                <div className="mt-8 pt-4 border-t border-gray-300">
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">Notes</h3>
                  <p className="text-gray-600">{notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-gray-300 text-center text-gray-500">
                <p>Thank you for choosing A-Frame Painting!</p>
                <p className="text-sm mt-2">Professional painting services you can trust</p>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDownloadPDF}
              disabled={sending}
              className="flex-1"
              style={{ backgroundColor: '#6366F1' }}
            >
              <Download size={16} className="mr-2" />
              {sending ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}