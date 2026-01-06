'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, X, FileImage, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReceiptUploaderProps {
  onUpload: (file: File) => Promise<void>;
  loading?: boolean;
  className?: string;
}

export function ReceiptUploader({
  onUpload,
  loading = false,
  className,
}: ReceiptUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile);
    setPreview(null);
    setSelectedFile(null);
  };

  const clearSelection = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  if (preview) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="relative">
          <img
            src={preview}
            alt="Receipt preview"
            className="w-full h-64 object-contain bg-gray-900 rounded-lg"
          />
          <button
            onClick={clearSelection}
            className="absolute top-2 right-2 p-1.5 bg-gray-900/80 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={clearSelection}
            className="flex-1 px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload & Parse
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />

      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          dragActive
            ? 'border-gold bg-gold/5'
            : 'border-gray-700 hover:border-gray-600'
        )}
      >
        <FileImage className="h-12 w-12 text-gray-500 mx-auto mb-4" />
        <p className="text-white font-medium mb-1">
          Drop your receipt here
        </p>
        <p className="text-gray-400 text-sm">
          or click to browse
        </p>
      </div>

      {/* Camera button for mobile */}
      <button
        onClick={() => cameraInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white hover:bg-gray-800 transition-colors md:hidden"
      >
        <Camera className="h-5 w-5" />
        Take Photo
      </button>
    </div>
  );
}
