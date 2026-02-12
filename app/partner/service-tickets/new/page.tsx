'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useAuth, usePartner } from '@/lib/hooks';
import { createPartnerTicket } from '@/lib/firebase/partnerTickets';
import { uploadWorkOrderPdf } from '@/lib/firebase/storage';
import { IssueType, Urgency, ISSUE_TYPE_OPTIONS, URGENCY_OPTIONS } from '@/types/partner';
import { Address } from '@/types/contractor';

type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'done' | 'error';

export default function NewServiceTicketPage() {
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const partnerId = user?.partnerId || '';
  const { partner } = usePartner(partnerId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SWO upload state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [workOrderUrl, setWorkOrderUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    issueType: 'warranty' as IssueType,
    issueDescription: '',
    productInfo: '',
    urgency: 'medium' as Urgency,
    preferredDate: '',
    serviceOrderNumber: '',
    caseNumber: '',
    estimatedCost: '',
  });

  const handleSwoUpload = async (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Please upload a PDF file');
      return;
    }

    if (!partnerId) {
      setUploadError('Partner information not found');
      return;
    }

    setUploadStatus('uploading');
    setUploadError(null);

    try {
      // Upload to Firebase Storage
      const url = await uploadWorkOrderPdf(partnerId, file);
      setWorkOrderUrl(url);
      setUploadedFileName(file.name);

      // Parse with AI
      setUploadStatus('parsing');
      const token = await getIdToken();
      const response = await fetch('/api/workorders/parse', {
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
        customerName: data.customerName || prev.customerName,
        customerPhone: data.customerPhone || prev.customerPhone,
        street: data.serviceAddress?.street || prev.street,
        city: data.serviceAddress?.city || prev.city,
        state: data.serviceAddress?.state || prev.state,
        zip: data.serviceAddress?.zip || prev.zip,
        issueDescription: data.issueDescription || prev.issueDescription,
        productInfo: data.productInfo || prev.productInfo,
        issueType: data.issueType || prev.issueType,
        serviceOrderNumber: data.serviceOrderNumber || prev.serviceOrderNumber,
        caseNumber: data.caseNumber || prev.caseNumber,
        estimatedCost: data.estimatedCost != null ? String(data.estimatedCost) : prev.estimatedCost,
      }));

      setUploadStatus('done');
    } catch (err) {
      setUploadStatus('error');
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSwoUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleSwoUpload(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !partnerId || !partner) {
      setError('User or partner information not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const serviceAddress: Address = {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
      };

      await createPartnerTicket({
        partnerId,
        partnerCompany: partner.companyName,
        submittedBy: user.uid,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail || null,
        serviceAddress,
        issueType: formData.issueType,
        issueDescription: formData.issueDescription,
        productInfo: formData.productInfo || null,
        photos: [],
        urgency: formData.urgency,
        preferredDate: formData.preferredDate
          ? Timestamp.fromDate(new Date(formData.preferredDate))
          : null,
        serviceOrderNumber: formData.serviceOrderNumber || null,
        caseNumber: formData.caseNumber || null,
        estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : null,
        workOrderUrl: workOrderUrl || null,
      });

      router.push('/partner/service-tickets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/partner/service-tickets"
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">New Service Ticket</h1>
          <p className="text-gray-400">Report a warranty or service issue</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {/* SWO Upload */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Upload Service Work Order</h2>
          <p className="text-sm text-gray-400">
            Upload a Service Work Order PDF to auto-fill the form fields below.
          </p>

          {uploadStatus === 'done' ? (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-green-400 font-medium">Form auto-filled from SWO</p>
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

        {/* Customer Info */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Customer Information</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Customer Name *</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="Full name"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Phone *</label>
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="(555) 555-5555"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                placeholder="email@example.com"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
              />
            </div>
          </div>
        </div>

        {/* Service Location */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Service Location</h2>

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

        {/* Issue Details */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Issue Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Issue Type *</label>
              <select
                value={formData.issueType}
                onChange={(e) => setFormData({ ...formData, issueType: e.target.value as IssueType })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
                required
              >
                {ISSUE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Urgency *</label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value as Urgency })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
                required
              >
                {URGENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label} - {opt.description}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Issue Description *</label>
            <textarea
              value={formData.issueDescription}
              onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
              placeholder="Describe the issue in detail..."
              rows={4}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Product Information</label>
            <input
              type="text"
              value={formData.productInfo}
              onChange={(e) => setFormData({ ...formData, productInfo: e.target.value })}
              placeholder="e.g., Model XYZ, installed March 2024"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Service Order #</label>
              <input
                type="text"
                value={formData.serviceOrderNumber}
                onChange={(e) => setFormData({ ...formData, serviceOrderNumber: e.target.value })}
                placeholder="e.g., 830000698"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Case #</label>
              <input
                type="text"
                value={formData.caseNumber}
                onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                placeholder="e.g., 08766282"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Estimated Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimatedCost}
                  onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-7 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Preferred Service Date</label>
              <input
                type="date"
                value={formData.preferredDate}
                onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href="/partner/service-tickets"
            className="flex-1 px-4 py-3 border border-gray-800 rounded-lg text-white text-center hover:bg-gray-900 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Ticket'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
