'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Invoice } from '@/types/invoice';
import { generateCSV, downloadCSV, generateCSVFilename } from '@/lib/utils/csv';

interface InvoiceExportCSVProps {
  invoices: Invoice[];
}

export function InvoiceExportCSV({ invoices }: InvoiceExportCSVProps) {
  const handleExport = () => {
    const formatDate = (timestamp: { toDate: () => Date } | null): string => {
      if (!timestamp) return '';
      return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    };

    const formatEntityName = (entity: string): string => {
      switch (entity) {
        case 'kd':
          return 'Keynote Digital';
        case 'kts':
          return 'Key Trade Solutions';
        case 'kr':
          return 'Key Renovations';
        case 'customer':
          return 'Customer';
        case 'subscriber':
          return 'Subscriber';
        default:
          return entity;
      }
    };

    const columns: { key: string; header: string; formatter: (row: Invoice) => string | number }[] = [
      { key: 'invoiceNumber', header: 'Invoice Number', formatter: (row: Invoice) => row.invoiceNumber },
      { key: 'status', header: 'Status', formatter: (row: Invoice) => row.status.toUpperCase() },
      {
        key: 'fromEntity',
        header: 'From Entity',
        formatter: (row: Invoice) => formatEntityName(row.from.entity),
      },
      { key: 'fromName', header: 'From Name', formatter: (row: Invoice) => row.from.name },
      {
        key: 'toEntity',
        header: 'To Entity',
        formatter: (row: Invoice) => formatEntityName(row.to.entity),
      },
      { key: 'toName', header: 'To Name', formatter: (row: Invoice) => row.to.name },
      { key: 'subtotal', header: 'Subtotal', formatter: (row: Invoice) => row.subtotal.toFixed(2) },
      { key: 'discount', header: 'Discount', formatter: (row: Invoice) => row.discount.toFixed(2) },
      { key: 'total', header: 'Total', formatter: (row: Invoice) => row.total.toFixed(2) },
      { key: 'dueDate', header: 'Due Date', formatter: (row: Invoice) => formatDate(row.dueDate) },
      { key: 'sentAt', header: 'Sent Date', formatter: (row: Invoice) => formatDate(row.sentAt) },
      { key: 'paidAt', header: 'Paid Date', formatter: (row: Invoice) => formatDate(row.paidAt) },
      {
        key: 'createdAt',
        header: 'Created Date',
        formatter: (row: Invoice) => formatDate(row.createdAt),
      },
    ];

    const csv = generateCSV(invoices, columns);
    const filename = generateCSVFilename('Invoices');
    downloadCSV(csv, filename);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={invoices.length === 0}>
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </Button>
  );
}
