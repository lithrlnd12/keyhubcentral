'use client';

import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InvoicePDFDocument } from './InvoicePDFDocument';
import { Invoice } from '@/types/invoice';

interface InvoicePDFButtonProps {
  invoice: Invoice;
  variant?: 'ghost' | 'outline' | 'secondary';
  showLabel?: boolean;
}

export function InvoicePDFButton({
  invoice,
  variant = 'ghost',
  showLabel = false,
}: InvoicePDFButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const doc = <InvoicePDFDocument invoice={invoice} />;
      const blob = await pdf(doc).toBlob();

      // Generate filename from invoice number
      const filename = `Invoice-${invoice.invoiceNumber}.pdf`;

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} onClick={handleExport} loading={loading} disabled={loading}>
      <Download className="w-4 h-4" />
      {showLabel && <span className="ml-2">Download PDF</span>}
    </Button>
  );
}
