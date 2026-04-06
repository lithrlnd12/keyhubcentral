'use client';

import { useMemo } from 'react';
import { useTranslation } from './useTranslation';
import { DEFAULT_PDF_LABELS, PDFLabels } from '@/lib/utils/pdfLabels';

/**
 * Hook that returns translated PDF labels.
 * Uses the translation hook to translate each label value.
 * English users get the defaults with zero overhead.
 */
export function usePDFLabels(): PDFLabels {
  const { t, isEnabled } = useTranslation();

  return useMemo(() => {
    if (!isEnabled) return DEFAULT_PDF_LABELS;

    const translated = { ...DEFAULT_PDF_LABELS };
    for (const [key, value] of Object.entries(DEFAULT_PDF_LABELS)) {
      (translated as Record<string, string>)[key] = t(value);
    }
    return translated;
  }, [t, isEnabled]);
}
