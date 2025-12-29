'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { CheckCircle, Loader2, Paperclip, X, FileText, ImageIcon } from 'lucide-react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { LeadAttachment } from '@/types/lead';

interface FormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

interface FilePreview {
  file: File;
  preview?: string;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function LeadCapturePage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    // Validate file count
    if (files.length + selectedFiles.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    // Validate file sizes and create previews
    const validFiles: FilePreview[] = [];
    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" is too large. Maximum size is 10MB`);
        continue;
      }

      const filePreview: FilePreview = { file };
      if (file.type.startsWith('image/')) {
        filePreview.preview = URL.createObjectURL(file);
      }
      validFiles.push(filePreview);
    }

    setFiles((prev) => [...prev, ...validFiles]);
    setError(null);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      // Revoke object URL if it exists
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadFiles = async (): Promise<LeadAttachment[]> => {
    const attachments: LeadAttachment[] = [];
    const timestamp = Date.now();

    for (const { file } of files) {
      const fileName = `${timestamp}-${file.name}`;
      const storageRef = ref(storage, `lead-attachments/${fileName}`);

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      attachments.push({
        name: file.name,
        url,
        type: file.type,
        size: file.size,
      });
    }

    return attachments;
  };

  const parseAddress = (addressStr: string) => {
    // Simple address parsing - can be enhanced
    const parts = addressStr.split(',').map((p) => p.trim());
    return {
      street: parts[0] || '',
      city: parts[1] || '',
      state: '',
      zip: parts[2] || '',
      lat: null,
      lng: null,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email');
      return;
    }

    setSubmitting(true);

    try {
      // Upload files first
      const attachments = files.length > 0 ? await uploadFiles() : [];

      // Schedule auto-call for 10 minutes from now if phone provided
      const phoneNumber = formData.phone.trim();
      let scheduledCallAt = null;
      if (phoneNumber) {
        const callTime = new Date();
        callTime.setMinutes(callTime.getMinutes() + 10);
        scheduledCallAt = Timestamp.fromDate(callTime);
      }

      // Create lead directly in Firestore
      await addDoc(collection(db, 'leads'), {
        source: 'event',
        campaignId: null,
        market: 'General',
        trade: 'General',
        customer: {
          name: formData.name.trim(),
          phone: phoneNumber || null,
          email: formData.email.trim() || null,
          address: parseAddress(formData.address),
          notes: formData.notes.trim() || null,
          attachments: attachments.length > 0 ? attachments : null,
        },
        quality: 'warm',
        status: 'new',
        assignedTo: null,
        assignedType: null,
        returnReason: null,
        returnedAt: null,
        // Auto-call fields
        scheduledCallAt,
        autoCallEnabled: !!phoneNumber,
        callAttempts: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting lead:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
        <div className="bg-brand-charcoal rounded-2xl p-8 max-w-md w-full text-center border border-gray-800">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Thank You!</h1>
          <p className="text-gray-400 mb-6">
            We&apos;ve received your information and will be in touch soon.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
              setFiles([]);
            }}
            className="text-brand-gold hover:text-brand-gold-light transition-colors"
          >
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
      <div className="bg-brand-charcoal rounded-2xl p-8 max-w-md w-full border border-gray-800">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/icon-512x512.png"
              alt="KeyHub Central"
              width={64}
              height={64}
              className="rounded-xl"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Get a Free Quote!</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors"
              placeholder="Your full name"
              autoComplete="name"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors"
              placeholder="(555) 123-4567"
              autoComplete="tel"
            />
          </div>

          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Address (Street, City, Zip Code)
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors"
              placeholder="123 Main St, Austin, 78701"
              autoComplete="street-address"
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Let us know the details of what you are looking for, and we&apos;ll contact you with a quote.
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors resize-none"
              placeholder="Tell us about your project..."
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Attach Files
            </label>

            {/* File Previews */}
            {files.length > 0 && (
              <div className="space-y-2 mb-3">
                {files.map((filePreview, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 bg-brand-black border border-gray-700 rounded-lg p-3"
                  >
                    {filePreview.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={filePreview.preview}
                        alt={filePreview.file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center text-gray-400">
                        {getFileIcon(filePreview.file.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{filePreview.file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(filePreview.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {files.length < MAX_FILES && (
              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-brand-black border border-gray-700 border-dashed rounded-lg text-gray-400 hover:text-white hover:border-gray-500 cursor-pointer transition-colors">
                <Paperclip className="w-5 h-5" />
                <span>Click to attach files</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                />
              </label>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Max {MAX_FILES} files, 10MB each. Images, PDFs, and documents accepted.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-brand-gold hover:bg-brand-gold-dark text-brand-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            By submitting, you agree to be contacted about our services.
          </p>
        </form>
      </div>
    </div>
  );
}
