'use client';

import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PnLPDFDocument } from './PnLPDFDocument';
import { CombinedPnL, PnLEntry } from '@/lib/utils/pnl';
import { generatePnLFilename } from '@/lib/utils/pdf';

interface PnLPDFButtonProps {
  data: {
    revenue: number;
    expenses: number;
    netIncome: number;
    entries: PnLEntry[];
  };
  combinedData?: CombinedPnL;
  entityName: string;
  entityKey: 'all' | 'kd' | 'kts' | 'kr';
  dateRange: string;
  datePresetLabel: string;
}

export function PnLPDFButton({
  data,
  combinedData,
  entityName,
  entityKey,
  dateRange,
  datePresetLabel,
}: PnLPDFButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const doc = (
        <PnLPDFDocument
          data={data}
          combinedData={combinedData}
          entityName={entityName}
          dateRange={dateRange}
          isCombined={entityKey === 'all'}
        />
      );

      const blob = await pdf(doc).toBlob();
      const filename = generatePnLFilename(entityKey, datePresetLabel);

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
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      loading={loading}
      disabled={loading}
    >
      <Download className="w-4 h-4 mr-2" />
      Export PDF
    </Button>
  );
}
