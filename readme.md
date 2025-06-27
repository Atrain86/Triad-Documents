import React, { useState } from 'react';

interface InvoiceProps {
  clientId: number;
  clientName: string;
  clientEmail: string;
  hourlyRate: number;
  assistantRate?: number;
  dailyHours: { date: string; hours: number }[];
  onSendInvoice: (invoiceData: any) => void; // Function to call backend email API
}

export default function InvoicePage({
  clientId,
  clientName,
  clientEmail,
  hourlyRate,
  assistantRate,
  dailyHours,
  onSendInvoice,
}: InvoiceProps) {
  const [suppliesCost, setSuppliesCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [attachReceipts, setAttachReceipts] = useState<FileList | null>(null);

  // Calculate labor total
  const totalHours = dailyHours.reduce((sum, entry) => sum + entry.hours, 0);
  const laborTotal = totalHours * hourlyRate;
  // BC tax ~12%
  const taxRate = 0.12;
  const taxAmount = (laborTotal + suppliesCost) * taxRate;
  const invoiceTotal = laborTotal + suppliesCost + taxAmount;

  const handleSend = () => {
    // Collect all invoice data
    const invoiceData = {
      clientId,
      clientName,
      clientEmail,
      dailyHours,
      suppliesCost,
      notes,
      laborTotal,
      taxAmount,
      invoiceTotal,
      receipts: attachReceipts,
    };
    onSendInvoice(invoiceData);
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Invoice for {clientName}</h2>

      <div className="mb-4">
        <label className="block font-medium mb-1">Total Hours: {totalHours.toFixed(2)}</label>
        <label className="block font-medium mb-1">Hourly Rate: ${hourlyRate.toFixed(2)}</label>
        <label className="block font-medium mb-1">Labor Total: ${laborTotal.toFixed(2)}</label>
      </div>

      <div className="mb-4">
        <label className="block font-medium mb-1" htmlFor="supplies">Supplies Cost ($)</label>
        <input
          id="supplies"
          type="number"
          value={suppliesCost}
          onChange={e => setSuppliesCost(parseFloat(e.target.value) || 0)}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="mb-4">
        <label className="block font-medium mb-1">Tax (12%)</label>
        <div>${taxAmount.toFixed(2)}</div>
      </div>

      <div className="mb-6">
        <label className="block font-medium mb-1">Invoice Total</label>
        <div className="text-xl font-bold">${invoiceTotal.toFixed(2)}</div>
      </div>

      <div className="mb-4">
        <label className="block font-medium mb-1" htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full border rounded px-3 py-2"
          rows={3}
          placeholder="Additional invoice notes"
        />
      </div>

      <div className="mb-4">
        <label className="block font-medium mb-1" htmlFor="receipts">Attach Receipts</label>
        <input
          id="receipts"
          type="file"
          multiple
          onChange={e => setAttachReceipts(e.target.files)}
          className="w-full"
        />
      </div>

      <button
        onClick={handleSend}
        className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700"
      >
        Send Invoice
      </button>
    </div>
  );
}
