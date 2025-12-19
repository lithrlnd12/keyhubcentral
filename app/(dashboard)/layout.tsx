'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SideNav, BottomNav, TopBar } from '@/components/navigation';
import { useAuth } from '@/lib/hooks';

const PAGE_TITLES: Record<string, string> = {
  '/overview': 'Dashboard',
  '/kts': 'Key Trade Solutions',
  '/kr': 'Key Renovations',
  '/kd': 'Keynote Digital',
  '/financials': 'Financials',
  '/admin': 'Admin',
  '/profile': 'Profile',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.status === 'pending') {
        router.push('/pending');
      } else if (user.status === 'suspended') {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="text-brand-gold">
          <svg
            className="animate-spin h-8 w-8"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user || user.status !== 'active') {
    return null;
  }

  // Get page title based on pathname
  const getPageTitle = () => {
    for (const [path, title] of Object.entries(PAGE_TITLES)) {
      if (pathname.startsWith(path)) {
        return title;
      }
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Desktop side navigation */}
      <SideNav />

      {/* Main content area */}
      <div className="md:pl-64">
        {/* Top bar */}
        <TopBar title={getPageTitle()} />

        {/* Page content */}
        <main className="p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}
