'use client';

import { useAuth } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import BulkScheduleOptimizer from '@/components/scheduling/BulkScheduleOptimizer';
import Link from 'next/link';

const ALLOWED_ROLES = ['owner', 'admin', 'pm'];

export default function SmartSchedulePage() {
  const { user, loading } = useAuth();
  const role = user?.role;
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !ALLOWED_ROLES.includes(role || ''))) {
      router.push('/unauthorized');
    }
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !ALLOWED_ROLES.includes(role || '')) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link
              href="/calendar"
              className="hover:text-gray-300 transition-colors"
            >
              Calendar
            </Link>
            <span>/</span>
            <span className="text-gray-400">Smart Schedule</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Smart Schedule</h1>
          <p className="text-gray-400 mt-1">
            AI-powered multi-job scheduling optimization
          </p>
        </div>

        <Link
          href="/calendar"
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Back to Calendar
        </Link>
      </div>

      {/* Main content */}
      <BulkScheduleOptimizer />
    </div>
  );
}
