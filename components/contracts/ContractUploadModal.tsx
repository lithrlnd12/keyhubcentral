'use client';

import { useState, useRef } from 'react';
import { ContractDocumentType, CONTRACT_TYPE_LABELS } from '@/types/contract';
import { uploadSignedContract } from '@/lib/firebase/contracts';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  X,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface ContractUploadModalProps {
  jobId: string;
  userId: string;
  buyerName: string;
  existingTypes: ContractDocumentType[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ContractUploadModal({
  jobId,
  userId,
  buyerName,
  existingTypes,
  onClose,
  onSuccess,
}: ContractUploadModalProps) {
  const [documentType, setDocumentType] = useState<ContractDocumentType | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableTypes: ContractDocumentType[] = (['remodeling_agreement', 'disclosure_statement'] as ContractDocumentType[])
    .filter((type) => !existingTypes.includes(type));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!documentType || !file) {
      setError('Please select a document type and file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await uploadSignedContract(jobId, documentType, file, buyerName, userId);
      onSuccess();
    } catch (err) {
      console.error('Failed to upload contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload contract');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-charcoal rounded-xl border border-gray-700 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Upload Signed Contract</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {availableTypes.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-400">All contracts have already been signed.</p>
            </div>
          ) : (
            <>
              {/* Document Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Document Type
                </label>
                <div className="space-y-2">
                  {availableTypes.map((type) => (
                    <label
                      key={type}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        documentType === type
                          ? 'border-brand-gold bg-brand-gold/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="documentType"
                        value={type}
                        checked={documentType === type}
                        onChange={(e) => setDocumentType(e.target.value as ContractDocumentType)}
                        className="sr-only"
                      />
                      <FileText className={`w-5 h-5 ${documentType === type ? 'text-brand-gold' : 'text-gray-500'}`} />
                      <span className={documentType === type ? 'text-white' : 'text-gray-300'}>
                        {CONTRACT_TYPE_LABELS[type]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Contract PDF
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Click to select a PDF file</p>
                    <p className="text-xs text-gray-500 mt-1">Max size: 10MB</p>
                  </button>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              {/* Info */}
              <p className="text-xs text-gray-500">
                Upload a scanned copy of a signed paper contract. The file should be a clear,
                legible PDF with all signatures visible.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          {availableTypes.length > 0 && (
            <Button
              onClick={handleUpload}
              disabled={!documentType || !file || uploading}
            >
              {uploading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Contract
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
