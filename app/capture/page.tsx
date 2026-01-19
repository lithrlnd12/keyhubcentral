'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { CheckCircle, Loader2, Paperclip, X, FileText, ImageIcon, Phone, MessageSquare } from 'lucide-react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { LeadAttachment, ContactPreference } from '@/types/lead';

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  zip: string;
  isHomeowner: string;
  notes: string;
  contactPreference: ContactPreference | '';
  smsCallOptIn: boolean;
}

interface FilePreview {
  file: File;
  preview?: string;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function LeadCapturePage() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    zip: '',
    isHomeowner: '',
    notes: '',
    contactPreference: '',
    smsCallOptIn: false,
  });
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.firstName.trim()) {
      setError('Please enter your first name');
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

      // Determine contact method based on preference
      const phoneNumber = formData.phone.trim();
      const contactPreference = formData.contactPreference || 'phone'; // Default to phone

      let scheduledCallAt = null;
      let scheduledSmsAt = null;
      let autoCallEnabled = false;
      let autoSmsEnabled = false;

      if (phoneNumber) {
        const contactTime = new Date();
        // contactTime.setMinutes(contactTime.getMinutes() + 10); // Production: 10 min delay

        if (contactPreference === 'sms') {
          scheduledSmsAt = Timestamp.fromDate(contactTime);
          autoSmsEnabled = true;
        } else {
          scheduledCallAt = Timestamp.fromDate(contactTime);
          autoCallEnabled = true;
        }
      }

      // Create lead directly in Firestore
      await addDoc(collection(db, 'leads'), {
        source: 'event',
        campaignId: null,
        market: 'General',
        trade: 'General',
        customer: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim() || null,
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
          phone: phoneNumber || null,
          email: formData.email.trim() || null,
          address: {
            street: formData.street.trim(),
            city: formData.city.trim(),
            state: '',
            zip: formData.zip.trim(),
          },
          isHomeowner: formData.isHomeowner || null,
          notes: formData.notes.trim() || null,
          attachments: attachments.length > 0 ? attachments : null,
        },
        quality: 'warm',
        status: 'new',
        assignedTo: null,
        assignedType: null,
        returnReason: null,
        returnedAt: null,
        // Contact preference
        contactPreference: phoneNumber ? contactPreference : null,
        // Auto-call fields
        scheduledCallAt,
        autoCallEnabled,
        callAttempts: 0,
        // Auto-SMS fields
        scheduledSmsAt,
        autoSmsEnabled,
        smsAttempts: 0,
        // SMS/Call opt-in consent (TCPA/CTIA compliance)
        smsCallOptIn: formData.smsCallOptIn,
        smsCallOptInAt: formData.smsCallOptIn ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Send confirmation email (fire and forget - don't block submission)
      if (formData.email.trim()) {
        fetch('/api/email/lead-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email.trim(),
            customerName: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
            contactPreference: contactPreference,
          }),
        }).catch((err) => console.error('Failed to send confirmation email:', err));
      }

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
              setFormData({ firstName: '', lastName: '', phone: '', email: '', street: '', city: '', zip: '', isHomeowner: '', notes: '', contactPreference: '', smsCallOptIn: false });
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors"
                placeholder="First"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors"
                placeholder="Last"
                autoComplete="family-name"
              />
            </div>
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
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-800 border border-r-0 border-gray-700 rounded-l-lg text-gray-400 text-sm">
                +1
              </span>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="flex-1 px-4 py-3 bg-brand-black border border-gray-700 rounded-r-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors"
                placeholder="(555) 123-4567"
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Contact Preference and Opt-In - only show if phone is entered */}
          {formData.phone.trim() && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  How would you like us to contact you?
                </label>
                <div className="flex gap-4">
                  <label
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                      formData.contactPreference === 'phone'
                        ? 'bg-brand-gold/10 border-brand-gold text-brand-gold'
                        : 'bg-brand-black border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="contactPreference"
                      value="phone"
                      checked={formData.contactPreference === 'phone'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <Phone className="w-5 h-5" />
                    <span className="font-medium">Phone Call</span>
                  </label>
                  <label
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                      formData.contactPreference === 'sms'
                        ? 'bg-brand-gold/10 border-brand-gold text-brand-gold'
                        : 'bg-brand-black border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="contactPreference"
                      value="sms"
                      checked={formData.contactPreference === 'sms'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <MessageSquare className="w-5 h-5" />
                    <span className="font-medium">Text Message</span>
                  </label>
                </div>
              </div>

              {/* SMS/Call Opt-In Consent */}
              <div className="bg-brand-black border border-gray-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="smsCallOptIn"
                    name="smsCallOptIn"
                    checked={formData.smsCallOptIn}
                    onChange={handleChange}
                    className="mt-1 h-5 w-5 rounded border-gray-600 bg-gray-800 text-brand-gold focus:ring-brand-gold/50 cursor-pointer"
                  />
                  <label htmlFor="smsCallOptIn" className="text-sm text-gray-300 cursor-pointer">
                    I agree to receive calls and text messages from KeyHub at the phone number provided.
                    Message frequency varies. Msg &amp; data rates may apply.
                    Reply STOP to unsubscribe or HELP for help.
                    Consent is not required for purchase.{' '}
                    <a
                      href="/legal/sms-terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-gold hover:text-brand-gold-light underline"
                    >
                      View SMS Terms
                    </a>
                  </label>
                </div>
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="street"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Street Address
            </label>
            <input
              type="text"
              id="street"
              name="street"
              value={formData.street}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors"
              placeholder="123 Main St"
              autoComplete="street-address"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors"
                placeholder="Austin"
                autoComplete="address-level2"
              />
            </div>
            <div>
              <label
                htmlFor="zip"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Zip Code
              </label>
              <input
                type="text"
                id="zip"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors"
                placeholder="78701"
                autoComplete="postal-code"
                maxLength={10}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="isHomeowner"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Are you a homeowner?
            </label>
            <select
              id="isHomeowner"
              name="isHomeowner"
              value={formData.isHomeowner}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold transition-colors"
            >
              <option value="">Select an option</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
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
            By submitting, you agree to our{' '}
            <a href="/legal/sms-terms" target="_blank" rel="noopener noreferrer" className="text-brand-gold hover:underline">
              Terms of Service
            </a>.
          </p>
        </form>
      </div>
    </div>
  );
}
