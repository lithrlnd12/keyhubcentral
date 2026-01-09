'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SideNav, BottomNav, TopBar } from '@/components/navigation';
import { useAuth } from '@/lib/hooks';

const PAGE_TITLES: Record<string, string> = {
  '/portal': 'Dashboard',
  '/portal/availability': 'Availability',
  '/portal/jobs': 'My Jobs',
  '/portal/earnings': 'Earnings',
  '/portal/inventory': 'Inventory',
  '/portal/my-profile': 'Profile',
  '/portal/settings': 'Settings',
};

export default function PortalLayout({
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
      } else if (user.role !== 'contractor') {
        // Non-contractors should use the main dashboard
        router.push('/overview');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.status !== 'active' || user.role !== 'contractor') {
    return null;
  }

  // Get page title based on pathname
  const getPageTitle = () => {
    // Check for exact match first
    if (PAGE_TITLES[pathname]) {
      return PAGE_TITLES[pathname];
    }
    // Check for partial matches (for sub-pages like /portal/inventory/count)
    for (const [path, title] of Object.entries(PAGE_TITLES)) {
      if (pathname.startsWith(path) && path !== '/portal') {
        return title;
      }
    }
    return 'Contractor Portal';
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
