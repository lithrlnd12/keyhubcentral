'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/contexts/TenantContext';
import { useAuth } from '@/lib/hooks';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function TenantPortalLogin() {
  const router = useRouter();
  const { tenant } = useTenant();
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { branding, companyName } = tenant;

  // If already logged in, redirect to dashboard
  if (user && !authLoading) {
    router.push(`/p/${tenant.slug}/dashboard`);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password, name, undefined, 'customer');
      } else {
        await signIn(email, password);
      }
      router.push(`/p/${tenant.slug}/dashboard`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg.includes('user-not-found') || msg.includes('wrong-password')) {
        setError('Invalid email or password');
      } else if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists. Try signing in.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: branding.backgroundColor || '#1A1A1A' }}
    >
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={companyName}
              className="h-16 w-auto mx-auto mb-4"
            />
          ) : (
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center font-bold text-white text-2xl mx-auto mb-4"
              style={{ backgroundColor: branding.primaryColor }}
            >
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <h1
            className="text-2xl font-bold"
            style={{ color: branding.textColor || '#FFFFFF' }}
          >
            {companyName}
          </h1>
          <p className="text-gray-400 mt-1">
            {isSignUp ? 'Create your account to get started' : 'Sign in to view your projects'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="text-sm text-gray-400 block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isSignUp}
                placeholder="John Smith"
                className="w-full px-4 py-3 bg-[#2D2D2D] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--tenant-primary)] transition-colors"
              />
            </div>
          )}

          <div>
            <label className="text-sm text-gray-400 block mb-1">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 bg-[#2D2D2D] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--tenant-primary)] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full pl-10 pr-12 py-3 bg-[#2D2D2D] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--tenant-primary)] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                {isSignUp ? 'Create Account' : 'Sign In'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Toggle sign in / sign up */}
        <p className="text-center text-gray-400 mt-6 text-sm">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="font-semibold hover:underline"
            style={{ color: branding.primaryColor }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>

        {/* Contact info */}
        {tenant.contact.phone && (
          <p className="text-center text-gray-500 mt-4 text-xs">
            Questions? Call us at{' '}
            <a href={`tel:${tenant.contact.phone}`} className="underline">
              {tenant.contact.phone}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
