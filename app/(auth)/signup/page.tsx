'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Select } from '@/components/ui';
import { useAuth } from '@/lib/hooks';
import { UserRole } from '@/types/user';

// Roles available for self-signup (excludes admin roles)
const SIGNUP_ROLES = [
  { value: 'contractor', label: 'Contractor / Installer' },
  { value: 'sales_rep', label: 'Sales Representative' },
  { value: 'partner', label: 'Partner Company' },
  { value: 'subscriber', label: 'Subscriber (Marketing)' },
];

interface PublicPartner {
  id: string;
  companyName: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, loading, error } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState<UserRole>('contractor');
  const [baseZipCode, setBaseZipCode] = useState('');
  const [partnerCompanies, setPartnerCompanies] = useState<PublicPartner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [localError, setLocalError] = useState('');

  // Fetch partner companies when partner role is selected
  useEffect(() => {
    if (requestedRole === 'partner') {
      fetch('/api/partners/public')
        .then((res) => res.json())
        .then((data) => setPartnerCompanies(data.partners || []))
        .catch(() => setPartnerCompanies([]));
    }
  }, [requestedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    // Validate zip code for sales_rep
    if (requestedRole === 'sales_rep') {
      if (!baseZipCode || !/^\d{5}$/.test(baseZipCode)) {
        setLocalError('Please enter a valid 5-digit zip code');
        return;
      }
    }

    // Validate partner company selection
    if (requestedRole === 'partner') {
      if (!selectedPartnerId) {
        setLocalError('Please select your company');
        return;
      }
      if (selectedPartnerId === 'other' && !companyName.trim()) {
        setLocalError('Please enter your company name');
        return;
      }
    }

    try {
      await signUp(
        email,
        password,
        displayName,
        phone || undefined,
        requestedRole,
        requestedRole === 'sales_rep' ? baseZipCode : undefined,
        requestedRole === 'partner' && selectedPartnerId !== 'other' ? selectedPartnerId : undefined,
        requestedRole === 'partner' && selectedPartnerId === 'other' ? companyName.trim() : undefined
      );
      router.push('/pending');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setLocalError(errorMessage);
    }
  };

  return (
    <div className="bg-brand-charcoal rounded-xl p-6 shadow-xl border border-gray-800">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white">Create an account</h1>
        <p className="text-gray-400 mt-1">Join KeyHub Central</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Phone (optional)"
          type="tel"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <Select
          label="I am applying as a"
          options={SIGNUP_ROLES}
          value={requestedRole}
          onChange={(e) => setRequestedRole(e.target.value as UserRole)}
        />

        {requestedRole === 'sales_rep' && (
          <Input
            label="Your Base Zip Code"
            type="text"
            placeholder="73012"
            value={baseZipCode}
            onChange={(e) => setBaseZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
            required
            maxLength={5}
          />
        )}

        {requestedRole === 'partner' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Your Company
              </label>
              <select
                className="w-full bg-brand-black border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-brand-gold"
                value={selectedPartnerId}
                onChange={(e) => {
                  setSelectedPartnerId(e.target.value);
                  if (e.target.value !== 'other') setCompanyName('');
                }}
                required
              >
                <option value="">Select your company...</option>
                {partnerCompanies.map((p) => (
                  <option key={p.id} value={p.id}>{p.companyName}</option>
                ))}
                <option value="other">Other (New Company)</option>
              </select>
            </div>
            {selectedPartnerId === 'other' && (
              <Input
                label="Company Name"
                type="text"
                placeholder="Your company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            )}
          </>
        )}

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        {(localError || error) && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {localError || error}
          </div>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-gray-400 text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-gold hover:text-brand-gold-light">
          Sign in
        </Link>
      </p>
    </div>
  );
}
