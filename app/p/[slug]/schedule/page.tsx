'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/contexts/TenantContext';
import { useAuth } from '@/lib/hooks';
import { useCustomerJobs } from '@/lib/hooks/useCustomerPortal';
import { TenantHeader } from '@/components/portal-wl/TenantHeader';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  MessageSquare,
  Send,
} from 'lucide-react';

export default function TenantSchedule() {
  const router = useRouter();
  const { tenant } = useTenant();
  const { user, loading: authLoading, signOut } = useAuth();
  const { jobs } = useCustomerJobs(user?.email || null, tenant.ownerId);

  const [selectedJobId, setSelectedJobId] = useState('');
  const [requestType, setRequestType] = useState<'callback' | 'visit' | 'question'>('callback');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const primaryColor = tenant.branding.primaryColor;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/p/${tenant.slug}`);
    }
  }, [user, authLoading, router, tenant.slug]);

  useEffect(() => {
    if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  const handleSignOut = async () => {
    await signOut();
    router.push(`/p/${tenant.slug}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;

    setSubmitting(true);
    try {
      // Create a scheduling request in Firestore
      await addDoc(collection(db, 'schedulingRequests'), {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantOwnerId: tenant.ownerId,
        customerId: user.uid,
        customerEmail: user.email,
        customerName: user.displayName,
        customerPhone: user.phone || null,
        jobId: selectedJobId || null,
        requestType,
        preferredDate: preferredDate || null,
        preferredTime: preferredTime || null,
        notes: notes.trim() || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) return null;

  const requestTypes = [
    { value: 'callback', label: 'Request a Callback', icon: Clock, description: 'We\'ll call you at your preferred time' },
    { value: 'visit', label: 'Schedule a Visit', icon: Calendar, description: 'Book an on-site visit or consultation' },
    { value: 'question', label: 'Ask a Question', icon: MessageSquare, description: 'Send a question about your project' },
  ] as const;

  // Generate time slots
  const timeSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  ];

  // Minimum date is tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  if (submitted) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: tenant.branding.backgroundColor || '#1A1A1A' }}>
        <TenantHeader tenant={tenant} customerName={user.displayName} onSignOut={handleSignOut} />
        <main className="max-w-3xl mx-auto px-4 py-12 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${primaryColor}22` }}
          >
            <Check size={32} style={{ color: primaryColor }} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Request Submitted!</h1>
          <p className="text-gray-400 mb-6">
            {tenant.companyName} will get back to you
            {requestType === 'callback' ? ' with a call' : requestType === 'visit' ? ' to confirm your visit' : ' with an answer'} soon.
          </p>
          <button
            onClick={() => router.push(`/p/${tenant.slug}/dashboard`)}
            className="px-6 py-3 rounded-lg font-semibold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            Back to Dashboard
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: tenant.branding.backgroundColor || '#1A1A1A' }}>
      <TenantHeader tenant={tenant} customerName={user.displayName} onSignOut={handleSignOut} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => router.push(`/p/${tenant.slug}/dashboard`)}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>

        <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Calendar size={22} style={{ color: primaryColor }} />
          Schedule & Requests
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Request type */}
          <div>
            <p className="text-sm text-gray-400 mb-3">What do you need?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {requestTypes.map((rt) => {
                const Icon = rt.icon;
                const isSelected = requestType === rt.value;
                return (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => setRequestType(rt.value)}
                    className="p-4 rounded-xl border text-left transition-all"
                    style={{
                      backgroundColor: isSelected ? `${primaryColor}15` : '#2D2D2D',
                      borderColor: isSelected ? primaryColor : '#374151',
                    }}
                  >
                    <Icon size={20} style={{ color: isSelected ? primaryColor : '#6B7280' }} className="mb-2" />
                    <p className="text-white text-sm font-medium">{rt.label}</p>
                    <p className="text-gray-500 text-xs mt-1">{rt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Job selector (if they have jobs) */}
          {jobs.length > 0 && (
            <div>
              <label className="text-sm text-gray-400 block mb-1">Related Project (optional)</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#2D2D2D] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 appearance-none"
              >
                <option value="">General inquiry</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.type.charAt(0).toUpperCase() + job.type.slice(1)} #{job.jobNumber} — {job.statusLabel}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date & time (for callback and visit) */}
          {requestType !== 'question' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Preferred Date</label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  min={minDate}
                  className="w-full px-4 py-2.5 bg-[#2D2D2D] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Preferred Time</label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#2D2D2D] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 appearance-none"
                >
                  <option value="">Any time</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">
              {requestType === 'question' ? 'Your Question' : 'Additional Notes'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                requestType === 'question'
                  ? 'What would you like to know?'
                  : 'Anything we should know before we contact you?'
              }
              rows={4}
              className="w-full px-4 py-2.5 bg-[#2D2D2D] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || (requestType === 'question' && !notes.trim())}
            className="w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {submitting ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Send size={18} />
                Submit Request
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
