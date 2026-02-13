'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, FileText, CheckCircle, AlertCircle, Camera, ImagePlus, X } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useAuth, usePartner } from '@/lib/hooks';
import { createLaborRequest } from '@/lib/firebase/laborRequests';
import { uploadLaborRequestPdf, uploadLaborRequestPhoto } from '@/lib/firebase/storage';
import { WorkType, WORK_TYPE_OPTIONS } from '@/types/partner';
import { Address } from '@/types/contractor';

type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'done' | 'error';

interface PhotoItem {
  url: string;
  name: string;
  preview: string;
}

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB

export default function NewLaborRequestPage() {
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const partnerId = user?.partnerId || '';
  const { partner, loading: partnerLoading } = usePartner(partnerId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo upload state
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);

  // PDF upload state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [workOrderUrl, setWorkOrderUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    workType: 'installation' as WorkType,
    description: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    dateNeeded: '',
    estimatedDuration: '',
    crewSize: 1,
    skillsRequired: '',
    specialEquipment: '',
    notes: '',
  });

  const handlePdfUpload = async (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Please upload a PDF file');
      return;
    }

    if (!user) {
      setUploadError('User information not found');
      return;
    }

    setUploadStatus('uploading');
    setUploadError(null);

    try {
      const url = await uploadLaborRequestPdf(user.uid, file);
      setWorkOrderUrl(url);
      setUploadedFileName(file.name);

      // Parse with AI
      setUploadStatus('parsing');
      const token = await getIdToken();
      const response = await fetch('/api/labor-orders/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fileUrl: url }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setUploadStatus('error');
        setUploadError(result.error || 'Failed to parse work order');
        return;
      }

      // Auto-fill form fields from parsed data
      const data = result.data;
      setFormData((prev) => ({
        ...prev,
        workType: data.workType || prev.workType,
        description: data.description || prev.description,
        street: data.location?.street || prev.street,
        city: data.location?.city || prev.city,
        state: data.location?.state || prev.state,
        zip: data.location?.zip || prev.zip,
        dateNeeded: data.dateNeeded || prev.dateNeeded,
        estimatedDuration: data.estimatedDuration || prev.estimatedDuration,
        crewSize: data.crewSize || prev.crewSize,
        skillsRequired: Array.isArray(data.skillsRequired) ? data.skillsRequired.join(', ') : prev.skillsRequired,
        specialEquipment: data.specialEquipment || prev.specialEquipment,
        notes: data.notes || prev.notes,
      }));

      setUploadStatus('done');
    } catch (err) {
      setUploadStatus('error');
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePdfUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handlePdfUpload(file);
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || !user) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    const newFiles = Array.from(files).slice(0, remaining);
    const validFiles = newFiles.filter((f) => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > MAX_PHOTO_SIZE) return false;
      return true;
    });

    if (validFiles.length === 0) return;

    setPhotoUploading(true);
    try {
      const uploaded: PhotoItem[] = [];
      for (const file of validFiles) {
        const url = await uploadLaborRequestPhoto(user.uid, file);
        uploaded.push({
          url,
          name: file.name,
          preview: URL.createObjectURL(file),
        });
      }
      setPhotos((prev) => [...prev, ...uploaded]);
    } catch {
      // Individual photo upload failed — already-uploaded photos remain
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !partnerId || !partner) {
      if (partnerLoading) {
        setError('Partner data is still loading, please try again');
      } else if (!partnerId) {
        setError('No partner company linked to your account. Contact an admin.');
      } else {
        setError('Partner company not found. Contact an admin.');
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const location: Address = {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
      };

      await createLaborRequest({
        partnerId,
        partnerCompany: partner.companyName,
        submittedBy: user.uid,
        workType: formData.workType,
        description: formData.description,
        location,
        dateNeeded: Timestamp.fromDate(new Date(formData.dateNeeded)),
        estimatedDuration: formData.estimatedDuration,
        crewSize: formData.crewSize,
        skillsRequired: formData.skillsRequired
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        specialEquipment: formData.specialEquipment || null,
        notes: formData.notes || null,
        photos: photos.map((p) => p.url),
        workOrderUrl: workOrderUrl || null,
      });

      router.push('/partner/labor-requests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/partner/labor-requests"
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">New Labor Request</h1>
          <p className="text-gray-400">Request crew for your installation or work needs</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {/* PDF Upload */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Upload Work Order</h2>
          <p className="text-sm text-gray-400">
            Upload a work order PDF to auto-fill the form fields below.
          </p>

          {uploadStatus === 'done' ? (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-green-400 font-medium">Form auto-filled from work order</p>
                {uploadedFileName && (
                  <p className="text-sm text-gray-400">{uploadedFileName}</p>
                )}
              </div>
            </div>
          ) : uploadStatus === 'uploading' || uploadStatus === 'parsing' ? (
            <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <Loader2 className="h-5 w-5 text-blue-400 animate-spin flex-shrink-0" />
              <p className="text-blue-400">
                {uploadStatus === 'uploading' ? 'Uploading PDF...' : 'Parsing work order with AI...'}
              </p>
            </div>
          ) : (
            <>
              {uploadStatus === 'error' && uploadError && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{uploadError}</p>
                </div>
              )}
              <div
                className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-gold/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <FileText className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 mb-1">
                  Drag & drop a PDF here, or click to browse
                </p>
                <p className="text-xs text-gray-500">PDF files only</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </>
          )}
        </div>

        {/* Work Type */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Work Details</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Work Type *</label>
            <select
              value={formData.workType}
              onChange={(e) => setFormData({ ...formData, workType: e.target.value as WorkType })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
              required
            >
              {WORK_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the work to be done..."
              rows={4}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold resize-none"
              required
            />
          </div>
        </div>

        {/* Location */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Location</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Street Address *</label>
            <input
              type="text"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              placeholder="123 Main St"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">City *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">State *</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
                required
              />
            </div>
          </div>

          <div className="w-1/2">
            <label className="block text-sm text-gray-400 mb-2">ZIP Code *</label>
            <input
              type="text"
              value={formData.zip}
              onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              placeholder="12345"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
              required
            />
          </div>
        </div>

        {/* Scheduling & Crew */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Scheduling & Crew</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Date Needed *</label>
              <input
                type="date"
                value={formData.dateNeeded}
                onChange={(e) => setFormData({ ...formData, dateNeeded: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Estimated Duration *</label>
              <input
                type="text"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                placeholder="e.g., 2-3 days"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Crew Size *</label>
            <input
              type="number"
              value={formData.crewSize}
              onChange={(e) => setFormData({ ...formData, crewSize: parseInt(e.target.value) || 1 })}
              min={1}
              max={20}
              className="w-32 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Skills Required</label>
            <input
              type="text"
              value={formData.skillsRequired}
              onChange={(e) => setFormData({ ...formData, skillsRequired: e.target.value })}
              placeholder="e.g., Plumbing, Electrical (comma separated)"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Special Equipment Needed</label>
            <input
              type="text"
              value={formData.specialEquipment}
              onChange={(e) => setFormData({ ...formData, specialEquipment: e.target.value })}
              placeholder="Any special tools or equipment"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Additional Notes</h2>

          <div>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold resize-none"
            />
          </div>
        </div>

        {/* Photos */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Photos</h2>
            <p className="text-sm text-gray-400">
              Attach up to {MAX_PHOTOS} photos of the job site (10MB each)
            </p>
          </div>

          {/* Photo thumbnails grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div key={photo.url} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic preview from upload */}
                  <img
                    src={photo.preview}
                    alt={photo.name}
                    className="w-full h-24 object-cover rounded-lg bg-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-gray-900/80 rounded-full text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {photos.length < MAX_PHOTOS && (
            <>
              {/* Hidden file inputs */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotoFiles(e.target.files)}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoFiles(e.target.files)}
                className="hidden"
              />

              {photoUploading ? (
                <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <Loader2 className="h-5 w-5 text-blue-400 animate-spin flex-shrink-0" />
                  <p className="text-blue-400">Uploading photo...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Drop zone / browse */}
                  <div
                    className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-gold/50 transition-colors"
                    onClick={() => photoInputRef.current?.click()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handlePhotoFiles(e.dataTransfer.files);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <ImagePlus className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">
                      Drag & drop images here, or click to browse
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {photos.length}/{MAX_PHOTOS} photos
                    </p>
                  </div>

                  {/* Camera button — mobile only */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white hover:bg-gray-800 transition-colors md:hidden"
                  >
                    <Camera className="h-5 w-5" />
                    Take Photo
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href="/partner/labor-requests"
            className="flex-1 px-4 py-3 border border-gray-800 rounded-lg text-white text-center hover:bg-gray-900 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || partnerLoading}
            className="flex-1 px-4 py-3 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
