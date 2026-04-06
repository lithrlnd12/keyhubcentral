'use client';

import { useState, useRef } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Job } from '@/types/job';
import { AddendumType, ADDENDUM_TYPE_LABELS, ContractAddendum } from '@/types/contract';
import { AddendumPDFDocument } from '@/components/pdf/AddendumPDFDocument';
import { SignaturePad } from '@/components/jobs/SignaturePad';
import { createAddendum } from '@/lib/firebase/addendums';
import { useAuth, useTranslation } from '@/lib/hooks';
import { Spinner } from '@/components/ui/Spinner';
import {
  X,
  Camera,
  DollarSign,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface AddendumFormProps {
  job: Job;
  onClose: () => void;
  onSaved: (addendum: ContractAddendum) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export function AddendumForm({ job, onClose, onSaved }: AddendumFormProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [type, setType] = useState<AddendumType>('scope_change');
  const [description, setDescription] = useState('');
  const [costImpact, setCostImpact] = useState<string>('0');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  const [contractorSignature, setContractorSignature] = useState<string | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setPhotos((prev) => [...prev, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!description.trim()) {
      setError(t('Description is required'));
      return;
    }
    if (!customerSignature || !contractorSignature) {
      setError(t('Both signatures are required'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const costNum = parseFloat(costImpact) || 0;
      const signedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const address = job.customer?.address;
      const addressStr = address
        ? `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`
        : 'N/A';

      // We need the addendum number before generating PDF — get current count
      // The createAddendum function handles this, but we need it for the PDF too
      // We'll generate PDF with a placeholder and update after
      const { getAddendums: getExisting } = await import('@/lib/firebase/addendums');
      const existing = await getExisting(job.id);
      const addendumNumber = existing.length + 1;

      // Generate PDF
      const pdfDoc = (
        <AddendumPDFDocument
          jobNumber={job.jobNumber || job.id}
          addendumNumber={addendumNumber}
          type={type}
          description={description.trim()}
          costImpact={costNum}
          customerName={job.customer.name}
          contractorName={user.displayName || 'Contractor'}
          customerAddress={addressStr}
          signedDate={signedDate}
          customerSignatureUrl={customerSignature}
          contractorSignatureUrl={contractorSignature}
        />
      );
      const pdfBlob = await pdf(pdfDoc).toBlob();

      const addendum = await createAddendum(job.id, {
        type,
        description: description.trim(),
        costImpact: costNum,
        customerSignatureDataUrl: customerSignature,
        contractorSignatureDataUrl: contractorSignature,
        customerName: job.customer.name,
        contractorName: user.displayName || 'Contractor',
        createdBy: user.uid,
        photoFiles: photos.length > 0 ? photos : undefined,
        pdfBlob,
      });

      onSaved(addendum);
    } catch (err) {
      console.error('Failed to create addendum:', err);
      setError(err instanceof Error ? err.message : t('Failed to save addendum'));
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-brand-charcoal rounded-2xl p-8 text-center max-w-sm w-full">
          <Spinner size="lg" />
          <p className="mt-4 text-white font-medium">{t('Saving Addendum...')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('Uploading signatures and generating PDF')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-brand-charcoal w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-brand-charcoal border-b border-gray-800 px-4 py-3 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-white">{t('New Addendum')}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Job context */}
          <div className="bg-gray-900/50 rounded-lg p-3 text-sm">
            <p className="text-gray-400">Job #{job.jobNumber} — <span className="text-white">{job.customer.name}</span></p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Change Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('Change Type')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ADDENDUM_TYPE_LABELS) as AddendumType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    type === t
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {ADDENDUM_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('Description of Changes')} <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('Describe the change — what needs to happen and why...')}
              rows={4}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold resize-none"
            />
          </div>

          {/* Cost Impact */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              {t('Cost Impact')}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={costImpact}
                onChange={(e) => setCostImpact(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('Positive = price increase, negative = decrease, 0 = no change')}
            </p>
            {parseFloat(costImpact) !== 0 && !isNaN(parseFloat(costImpact)) && (
              <p className={`text-sm mt-1 font-medium ${parseFloat(costImpact) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {parseFloat(costImpact) > 0 ? '+' : ''}{fmt(parseFloat(costImpact))} {t('to contract')}
              </p>
            )}
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Camera className="w-4 h-4 inline mr-1" />
              {t('Photos (optional)')}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handleAddPhoto}
              className="hidden"
            />

            {photoPreviews.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {photoPreviews.map((preview, i) => (
                  <div key={i} className="relative w-16 h-16">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button
                      onClick={() => handleRemovePhoto(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-gray-500 hover:text-white transition-colors text-sm"
            >
              <Camera className="w-4 h-4 inline mr-2" />
              {photoPreviews.length > 0 ? t('Add More Photos') : t('Take / Upload Photo')}
            </button>
          </div>

          {/* Customer Signature */}
          <div>
            <SignaturePad
              label={`Customer Signature — ${job.customer.name}`}
              onSave={(dataUrl) => setCustomerSignature(dataUrl)}
              onClear={() => setCustomerSignature(null)}
            />
          </div>

          {/* Contractor Signature */}
          <div>
            <SignaturePad
              label={`Contractor Signature — ${user?.displayName || 'Contractor'}`}
              onSave={(dataUrl) => setContractorSignature(dataUrl)}
              onClear={() => setContractorSignature(null)}
            />
          </div>

          {/* Submit */}
          <div className="sticky bottom-0 bg-brand-charcoal pt-3 pb-2 border-t border-gray-800 -mx-4 px-4">
            <button
              onClick={handleSubmit}
              disabled={!description.trim() || !customerSignature || !contractorSignature}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-5 h-5" />
              {t('Sign & Save Addendum')}
            </button>
            {(!customerSignature || !contractorSignature) && (
              <p className="text-xs text-gray-500 text-center mt-2">{t('Both signatures required')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
