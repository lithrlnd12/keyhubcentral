'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/lib/hooks';
import { createLead } from '@/lib/firebase/leads';
import { createNotification } from '@/lib/firebase/notifications';
import { SPECIALTIES } from '@/types/contractor';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function CustomerBookPage() {
  const { user } = useAuth();
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty)
        ? prev.filter((s) => s !== specialty)
        : [...prev, specialty]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedSpecialties.length === 0) return;

    setSubmitting(true);
    try {
      await createLead({
        source: 'customer_portal',
        campaignId: null,
        market: user.serviceAddress?.city || '',
        trade: selectedSpecialties[0].toLowerCase().replace(/\s+/g, '_'),
        customer: {
          name: user.displayName || '',
          phone: user.phone || null,
          email: user.email || null,
          address: {
            street: user.serviceAddress?.street || '',
            city: user.serviceAddress?.city || '',
            state: user.serviceAddress?.state || '',
            zip: user.serviceAddress?.zip || '',
          },
          notes: description || null,
        },
        quality: 'hot',
        status: 'new',
        assignedTo: null,
        assignedType: null,
        returnReason: null,
        returnedAt: null,
        specialties: selectedSpecialties,
        customerId: user.uid,
        preferredDate: preferredDate || undefined,
      });

      // Notify admins about new customer request
      try {
        const adminsQuery = query(
          collection(db, 'users'),
          where('role', 'in', ['owner', 'admin']),
          where('status', '==', 'active')
        );
        const adminsSnap = await getDocs(adminsQuery);
        adminsSnap.docs.forEach((adminDoc) => {
          createNotification(adminDoc.id, 'lead_submitted', {
            customerName: user.displayName || 'A customer',
            specialties: selectedSpecialties.join(', '),
            city: user.serviceAddress?.city || '',
            leadId: '',
          }).catch(() => {});
        });
      } catch {
        // Non-critical — don't block the user
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting booking request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Request Submitted!</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
            We&apos;re matching you with a top-rated pro in your area. You&apos;ll be notified as soon as a contractor accepts your project.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => { setSubmitted(false); setSelectedSpecialties([]); setDescription(''); setPreferredDate(''); }}>
              Book Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Book a Pro</h1>
        <p className="text-gray-400 mt-1">Tell us what you need and we&apos;ll match you with a vetted contractor</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Specialties Multi-Select */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              What do you need done? <span className="text-gray-500">(select all that apply)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SPECIALTIES.map((specialty) => (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => toggleSpecialty(specialty)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    selectedSpecialties.includes(specialty)
                      ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/40'
                      : 'bg-brand-black border border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {specialty}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Describe your project
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about the scope, materials, any preferences..."
              className="w-full bg-brand-black border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold min-h-[100px] resize-y"
              required
            />
          </div>

          {/* Preferred Date */}
          <Input
            label="Preferred start date (optional)"
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
          />

          {/* Service Address Display */}
          {user?.serviceAddress && (
            <div className="p-3 bg-brand-black rounded-lg border border-gray-700">
              <p className="text-xs text-gray-500 mb-1">Service location</p>
              <p className="text-sm text-white">
                {user.serviceAddress.street}, {user.serviceAddress.city}, {user.serviceAddress.state} {user.serviceAddress.zip}
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={submitting}
            disabled={selectedSpecialties.length === 0}
          >
            Submit Request
          </Button>
        </form>
      </Card>
    </div>
  );
}
