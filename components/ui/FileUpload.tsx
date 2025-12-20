'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in MB
  label?: string;
  error?: string;
  currentFile?: { name: string; url?: string } | null;
  onRemove?: () => void;
  uploading?: boolean;
  uploadProgress?: number;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  accept = '*',
  maxSize = 10,
  label,
  error,
  currentFile,
  onRemove,
  uploading = false,
  uploadProgress = 0,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSelect(file);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSelect(file);
    }
  };

  const validateAndSelect = (file: File) => {
    setLocalError(null);

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setLocalError(`File size must be less than ${maxSize}MB`);
      return;
    }

    onFileSelect(file);
  };

  const displayError = error || localError;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
        </label>
      )}

      {currentFile && !uploading ? (
        <div className="flex items-center justify-between p-3 bg-brand-charcoal border border-gray-700 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-white">{currentFile.name}</p>
              {currentFile.url && (
                <a
                  href={currentFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-gold hover:text-brand-gold-light"
                >
                  View file
                </a>
              )}
            </div>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
            isDragging
              ? 'border-brand-gold bg-brand-gold/5'
              : displayError
                ? 'border-red-500 bg-red-500/5'
                : 'border-gray-700 hover:border-gray-600 bg-brand-charcoal',
            uploading && 'pointer-events-none'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
          />

          {uploading ? (
            <div className="w-full">
              <div className="flex items-center justify-center gap-2 mb-2">
                <File className="w-6 h-6 text-brand-gold animate-pulse" />
                <span className="text-sm text-gray-400">Uploading...</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-gold transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center mt-1">
                {uploadProgress}%
              </p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-500 mb-2" />
              <p className="text-sm text-gray-400 text-center">
                <span className="text-brand-gold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Max file size: {maxSize}MB
              </p>
            </>
          )}
        </div>
      )}

      {displayError && (
        <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
