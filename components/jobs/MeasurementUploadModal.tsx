'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { X, Upload, FileText, Download, Trash2 } from 'lucide-react';

interface MeasurementUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  existingFile?: {
    url: string;
    name: string;
  };
}

export function MeasurementUploadModal({
  isOpen,
  onClose,
  onUpload,
  onRemove,
  existingFile,
}: MeasurementUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      await onUpload(file);
      onClose();
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    if (!confirm('Are you sure you want to remove this uploaded form?')) return;

    setRemoving(true);
    try {
      await onRemove();
      onClose();
    } catch (err) {
      console.error('Error removing file:', err);
      setError('Failed to remove file. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-brand-charcoal rounded-xl border border-gray-800 max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">
            {existingFile ? 'Uploaded Measurement Form' : 'Upload Measurement Form'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* Existing file display */}
        {existingFile ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg">
              <FileText className="w-10 h-10 text-brand-gold" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{existingFile.name}</p>
                <p className="text-sm text-gray-400">PDF Document</p>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={existingFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  View / Download
                </Button>
              </a>
              {onRemove && (
                <Button
                  variant="danger"
                  onClick={handleRemove}
                  loading={removing}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="border-t border-gray-700 pt-4">
              <p className="text-sm text-gray-400 mb-3">Upload a new form to replace:</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleInputChange}
                className="hidden"
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                loading={uploading}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload New PDF
              </Button>
            </div>
          </div>
        ) : (
          /* Upload dropzone */
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-brand-gold bg-brand-gold/10'
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleInputChange}
              className="hidden"
            />

            <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-white mb-2">
              Drag and drop your PDF here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to browse (max 10MB)
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              loading={uploading}
            >
              Select PDF File
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            Upload a filled-out Wall Measurement Form PDF as an alternative to digital entry.
          </p>
        </div>
      </div>
    </div>
  );
}
