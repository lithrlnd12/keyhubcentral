'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/lib/hooks';
import { tenant } from '@/lib/config/tenant';

export default function CustomerSignUpPage() {
  const router = useRouter();
  const { signUp, loading, error } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

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

    if (!zip || !/^\d{5}$/.test(zip)) {
      setLocalError('Please enter a valid 5-digit zip code');
      return;
    }

    try {
      await signUp(
        email,
        password,
        displayName,
        phone || undefined,
        'customer',
        undefined, // baseZipCode
        undefined, // selectedPartnerId
        undefined, // companyName
        { street, city, state, zip }
      );
      router.push('/customer/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setLocalError(errorMessage);
    }
  };

  return (
    <div className="bg-brand-charcoal rounded-xl p-6 shadow-xl border border-gray-800">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white">Book a Pro Today</h1>
        <p className="text-gray-400 mt-1">Create your free account</p>
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
          label="Phone"
          type="tel"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {/* Service Address */}
        <div className="pt-2 border-t border-gray-700">
          <p className="text-sm font-medium text-gray-300 mb-3">Service Address</p>
          <div className="space-y-3">
            <Input
              label="Street"
              type="text"
              placeholder="123 Main St"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              required
            />
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-3">
                <Input
                  label="City"
                  type="text"
                  placeholder="Oklahoma City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-1">
                <Input
                  label="State"
                  type="text"
                  placeholder="OK"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                  required
                  maxLength={2}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Zip"
                  type="text"
                  placeholder="73012"
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  required
                  maxLength={5}
                />
              </div>
            </div>
          </div>
        </div>

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

      <div className="mt-6 text-center space-y-2">
        <p className="text-gray-400 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-gold hover:text-brand-gold-light">
            Sign in
          </Link>
        </p>
        <p className="text-gray-500 text-xs">
          Are you a contractor?{' '}
          <Link href="/signup" className="text-brand-gold hover:text-brand-gold-light">
            Apply here
          </Link>
        </p>
      </div>
    </div>
  );
}
