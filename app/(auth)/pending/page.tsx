'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Mail } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/hooks';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  useEffect(() => {
    if (!loading && user?.status === 'active') {
      router.push('/overview');
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="bg-brand-charcoal rounded-xl p-6 shadow-xl border border-gray-800 text-center">
      <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Clock className="w-8 h-8 text-brand-gold" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">
        Account Pending Approval
      </h1>

      <p className="text-gray-400 mb-6">
        Thank you for signing up! Your account is currently pending approval from an administrator.
        You&apos;ll receive an email once your account has been activated.
      </p>

      <div className="bg-brand-black/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-center gap-2 text-gray-300">
          <Mail className="w-4 h-4" />
          <span className="text-sm">{user?.email || 'Loading...'}</span>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.location.reload()}
        >
          Check Status
        </Button>

        <Button
          variant="ghost"
          className="w-full"
          onClick={handleSignOut}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
