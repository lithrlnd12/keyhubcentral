'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/contexts/TenantContext';
import { useAuth } from '@/lib/hooks';
import { TenantHeader } from '@/components/portal-wl/TenantHeader';
import {
  CheckCircle,
  Loader2,
  Paperclip,
  X,
  FileText,
  ImageIcon,
  Phone,
  MessageSquare,
  Send,
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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

export default function TenantLeadCapture() {
  const router = useRouter();
  const { tenant } = useTenant();
  const { user, signOut } = useAuth();
  const primaryColor = tenant.branding.primaryColor;

  // Pre-fill from logged-in user if available
  const [formData, setFormData] = useState<FormData>({
    firstName: user?.displayName?.split(' ')[0] || '',
    lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
    phone: user?.phone || '',
    email: user?.email || '',
    street: user?.serviceAddress?.street || '',
    city: user?.serviceAddress?.city || '',
    zip: user?.serviceAddress?.zip || '',
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

    if (files.length + selectedFiles.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      if (newFiles[index].preview) URL.revokeObjectURL(newFiles[index].preview!);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadFiles = async (): Promise<LeadAttachment[]> => {
    const attachments: LeadAttachment[] = [];
    const timestamp = Date.now();

    for (const { file } of files) {
      const fileName = `${timestamp}-${file.name}`;
      const storageRef = ref(storage, `lead-attachments/${tenant.slug}/${fileName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      attachments.push({ name: file.name, url, type: file.type, size: file.size });
    }

    return attachments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      const attachments = files.length > 0 ? await uploadFiles() : [];
      const phoneNumber = formData.phone.trim();
      const contactPreference = formData.contactPreference || 'phone';

      const leadData: Record<string, unknown> = {
        source: 'customer_portal' as const,
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
        // Auto-assign to tenant owner so lead goes directly to them
        status: 'assigned',
        assignedTo: tenant.ownerId,
        assignedType: 'internal',
        autoAssigned: true,
        autoAssignedAt: serverTimestamp(),
        contactPreference: phoneNumber ? contactPreference : null,
        callAttempts: 0,
        smsAttempts: 0,
        smsCallOptIn: formData.smsCallOptIn,
        smsCallOptInAt: formData.smsCallOptIn ? serverTimestamp() : null,
        // Tag with tenant info for filtering
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantOwnerId: tenant.ownerId,
        // Link to logged-in customer if available
        customerId: user?.uid || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const leadRef = await addDoc(collection(db, 'leads'), leadData);
      const customerName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();

      // Send confirmation email (fire and forget)
      if (formData.email.trim()) {
        fetch('/api/email/lead-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email.trim(),
            customerName,
            contactPreference,
            companyName: tenant.companyName,
          }),
        }).catch((err) => console.error('Failed to send confirmation email:', err));
      }

      // Notify tenant owner of new lead (in-app notification, fire and forget)
      addDoc(collection(db, 'notifications'), {
        userId: tenant.ownerId,
        type: 'new_lead',
        title: 'New Lead from Portal',
        message: `${customerName} submitted a quote request via your customer portal.`,
        link: `/kd/leads`,
        read: false,
        createdAt: serverTimestamp(),
      }).catch((err) => console.error('Failed to create notification:', err));

      // Trigger SMS or call if opted in
      if (phoneNumber && formData.smsCallOptIn) {
        if (contactPreference === 'sms') {
          fetch('/api/sms/send-initial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: leadRef.id, phone: phoneNumber, customerName }),
          }).catch((err) => console.error('Failed to send initial SMS:', err));
        } else {
          fetch('/api/voice/call-lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: leadRef.id, phone: phoneNumber, customerName }),
          }).catch((err) => console.error('Failed to trigger call:', err));
        }
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting lead:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push(`/p/${tenant.slug}`);
  };

  if (submitted) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: tenant.branding.backgroundColor || '#1A1A1A' }}>
        <TenantHeader tenant={tenant} customerName={user?.displayName} onSignOut={user ? handleSignOut : undefined} />
        <main className="max-w-md mx-auto px-4 py-12 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: '#10B98122' }}
          >
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Thank You!</h1>
          <p className="text-gray-400 mb-6">
            {tenant.companyName} has received your request and will be in touch soon.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({ firstName: '', lastName: '', phone: '', email: user?.email || '', street: '', city: '', zip: '', isHomeowner: '', notes: '', contactPreference: '', smsCallOptIn: false });
                setFiles([]);
              }}
              className="px-5 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:text-white transition-colors text-sm"
            >
              Submit Another
            </button>
            {user && (
              <button
                onClick={() => router.push(`/p/${tenant.slug}/dashboard`)}
                className="px-5 py-2.5 rounded-lg font-semibold text-white text-sm"
                style={{ backgroundColor: primaryColor }}
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-colors";

  return (
    <div className="min-h-screen" style={{ backgroundColor: tenant.branding.backgroundColor || '#1A1A1A' }}>
      <TenantHeader tenant={tenant} customerName={user?.displayName} onSignOut={user ? handleSignOut : undefined} />

      <main className="max-w-lg mx-auto px-4 py-6">
        {user && (
          <button
            onClick={() => router.push(`/p/${tenant.slug}/dashboard`)}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mb-4 text-sm"
          >
            ← Dashboard
          </button>
        )}

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Get a Free Quote</h1>
          <p className="text-gray-400 mt-1">
            Tell us about your project and {tenant.companyName} will get back to you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">First Name <span className="text-red-400">*</span></label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First" autoComplete="given-name" className={inputClass} style={{ borderColor: undefined }} onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = '#374151'} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Last Name</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last" autoComplete="family-name" className={inputClass} onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = '#374151'} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email <span className="text-red-400">*</span></label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" className={inputClass} onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = '#374151'} />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Phone</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-[#2D2D2D] border border-r-0 border-gray-700 rounded-l-lg text-gray-400 text-sm">+1</span>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="(555) 123-4567" autoComplete="tel" className={`${inputClass} rounded-l-none`} onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = '#374151'} />
            </div>
          </div>

          {/* Contact preference */}
          {formData.phone.trim() && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-2">How should we contact you?</label>
                <div className="flex gap-3">
                  <label
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all"
                    style={{
                      backgroundColor: formData.contactPreference === 'phone' ? `${primaryColor}15` : '#1A1A1A',
                      borderColor: formData.contactPreference === 'phone' ? primaryColor : '#374151',
                      color: formData.contactPreference === 'phone' ? primaryColor : '#9CA3AF',
                    }}
                  >
                    <input type="radio" name="contactPreference" value="phone" checked={formData.contactPreference === 'phone'} onChange={handleChange} className="sr-only" />
                    <Phone size={18} />
                    <span className="font-medium text-sm">Phone Call</span>
                  </label>
                  <label
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all"
                    style={{
                      backgroundColor: formData.contactPreference === 'sms' ? `${primaryColor}15` : '#1A1A1A',
                      borderColor: formData.contactPreference === 'sms' ? primaryColor : '#374151',
                      color: formData.contactPreference === 'sms' ? primaryColor : '#9CA3AF',
                    }}
                  >
                    <input type="radio" name="contactPreference" value="sms" checked={formData.contactPreference === 'sms'} onChange={handleChange} className="sr-only" />
                    <MessageSquare size={18} />
                    <span className="font-medium text-sm">Text Message</span>
                  </label>
                </div>
              </div>

              {/* Opt-in consent */}
              <div className="bg-[#2D2D2D] border border-gray-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="smsCallOptIn" name="smsCallOptIn" checked={formData.smsCallOptIn} onChange={handleChange} className="mt-1 h-4 w-4 rounded border-gray-600 cursor-pointer flex-shrink-0" style={{ accentColor: primaryColor }} />
                  <label htmlFor="smsCallOptIn" className="text-xs text-gray-400 cursor-pointer">
                    I consent to receive automated text messages and phone calls from {tenant.companyName} at the phone number provided regarding quotes, appointments, and project updates. Msg & data rates may apply. Reply STOP to cancel.
                  </label>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Street Address</label>
            <input type="text" name="street" value={formData.street} onChange={handleChange} placeholder="123 Main St" autoComplete="street-address" className={inputClass} onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = '#374151'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" autoComplete="address-level2" className={inputClass} onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = '#374151'} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Zip Code</label>
              <input type="text" name="zip" value={formData.zip} onChange={handleChange} placeholder="73102" autoComplete="postal-code" maxLength={10} className={inputClass} onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = '#374151'} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Are you a homeowner?</label>
            <select name="isHomeowner" value={formData.isHomeowner} onChange={handleChange} className={`${inputClass} appearance-none`}>
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Project Details</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} placeholder="Tell us about your project..." className={`${inputClass} resize-none`} onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = '#374151'} />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Attach Photos or Files</label>
            {files.length > 0 && (
              <div className="space-y-2 mb-3">
                {files.map((fp, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[#1A1A1A] border border-gray-700 rounded-lg p-3">
                    {fp.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fp.preview} alt={fp.file.name} className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center text-gray-400">
                        {fp.file.type.startsWith('image/') ? <ImageIcon size={18} /> : <FileText size={18} />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{fp.file.name}</p>
                      <p className="text-xs text-gray-500">{(fp.file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="p-1 text-gray-400 hover:text-red-400"><X size={16} /></button>
                  </div>
                ))}
              </div>
            )}
            {files.length < MAX_FILES && (
              <label className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-700 border-dashed rounded-lg text-gray-400 hover:text-white hover:border-gray-500 cursor-pointer transition-colors bg-[#1A1A1A]">
                <Paperclip size={18} />
                <span className="text-sm">Click to attach files</span>
                <input ref={fileInputRef} type="file" onChange={handleFileChange} multiple accept="image/*,.pdf,.doc,.docx" className="hidden" />
              </label>
            )}
            <p className="text-xs text-gray-500 mt-1">Max {MAX_FILES} files, 10MB each</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {submitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Send size={18} />
                Get My Free Quote
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            By submitting, you agree to be contacted by {tenant.companyName}.
          </p>
        </form>

        {/* Call directly */}
        {tenant.contact.phone && (
          <div className="mt-6 pt-6 border-t border-gray-700 text-center">
            <p className="text-sm text-gray-400 mb-2">Or call us directly</p>
            <a
              href={`tel:${tenant.contact.phone}`}
              className="inline-flex items-center gap-2 font-semibold text-lg transition-colors hover:opacity-80"
              style={{ color: primaryColor }}
            >
              <Phone size={20} />
              {tenant.contact.phone}
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
