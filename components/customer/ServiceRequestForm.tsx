'use client';

import { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { createServiceRequestFromCustomer } from '@/lib/firebase/customerAccess';

interface ServiceRequestFormProps {
  jobId: string;
  customerEmail: string;
  onClose: () => void;
  onSuccess?: () => void;
  className?: string;
}

type Urgency = 'low' | 'medium' | 'high';
type ContactPref = 'phone' | 'email';

export function ServiceRequestForm({
  jobId,
  customerEmail,
  onClose,
  onSuccess,
  className,
}: ServiceRequestFormProps) {
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('medium');
  const [contactPreference, setContactPreference] = useState<ContactPref>('email');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - photos.length;
    const newFiles = files.slice(0, remaining);

    if (newFiles.length === 0) return;

    setPhotos((prev) => [...prev, ...newFiles]);

    // Create preview URLs
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreviewUrls((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      setError('Please describe the issue.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Upload photos if any
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const storageRef = ref(
          storage,
          `service-requests/${jobId}/${Date.now()}-${photo.name}`
        );
        const snapshot = await uploadBytes(storageRef, photo);
        const url = await getDownloadURL(snapshot.ref);
        photoUrls.push(url);
      }

      // Create the service request
      await createServiceRequestFromCustomer(jobId, customerEmail, {
        description: description.trim(),
        urgency,
        contactPreference,
        photoUrls,
      });

      setSuccess(true);
      onSuccess?.();

      // Auto-close after a brief delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error creating service request:', err);
      setError(err.message || 'Failed to submit service request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={cn('bg-white rounded-2xl p-6 text-center', className)}>
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Request Submitted
        </h3>
        <p className="text-sm text-gray-500">
          We&apos;ll get back to you shortly via your preferred contact method.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-2xl', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Request Service
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-5">
        {/* Description */}
        <div>
          <label
            htmlFor="sr-description"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Describe the issue <span className="text-red-500">*</span>
          </label>
          <textarea
            id="sr-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please describe the issue or service needed..."
            rows={4}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[100px]"
          />
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Photos (optional, up to 3)
          </label>
          <div className="flex flex-wrap gap-2">
            {photoPreviewUrls.map((url, index) => (
              <div key={index} className="relative w-20 h-20">
                <img
                  src={url}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  aria-label="Remove photo"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {photos.length < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span className="text-[10px] mt-1">Add</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Urgency
          </label>
          <div className="flex gap-2">
            {(
              [
                { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700 border-gray-300' },
                { value: 'medium', label: 'Medium', color: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
                { value: 'high', label: 'High', color: 'bg-red-50 text-red-700 border-red-300' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setUrgency(option.value)}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all',
                  urgency === option.value
                    ? option.color
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contact preference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            How should we contact you?
          </label>
          <div className="flex gap-2">
            {(
              [
                { value: 'email', label: 'Email' },
                { value: 'phone', label: 'Phone' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setContactPreference(option.value)}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all',
                  contactPreference === option.value
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !description.trim()}
          className={cn(
            'w-full py-3 rounded-lg text-sm font-semibold transition-all',
            'bg-blue-600 text-white hover:bg-blue-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center justify-center gap-2'
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Service Request'
          )}
        </button>
      </form>
    </div>
  );
}
