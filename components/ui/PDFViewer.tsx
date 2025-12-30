'use client';

import { useState, useEffect } from 'react';
import { X, Download, ExternalLink, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { Button } from './Button';

interface PDFViewerProps {
  url: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PDFViewer({ url, title = 'Document', isOpen, onClose }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Reset zoom when opening
      setZoom(100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl h-[90vh] mx-4 bg-brand-charcoal rounded-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 mr-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-400 w-12 text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

            {/* Open in new tab */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5" />
            </a>

            {/* Download */}
            <a
              href={url}
              download
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto bg-gray-900 p-4">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
            </div>
          )}
          <div
            className="flex justify-center"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            <iframe
              src={`${url}#toolbar=0`}
              className="w-full bg-white rounded"
              style={{ height: '80vh', maxWidth: '800px' }}
              onLoad={() => setLoading(false)}
              title={title}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface PDFViewerButtonProps {
  url: string | null;
  title?: string;
  label?: string;
  className?: string;
}

export function PDFViewerButton({
  url,
  title = 'Document',
  label = 'View PDF',
  className = '',
}: PDFViewerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!url) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        {label}
      </Button>

      <PDFViewer
        url={url}
        title={title}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
