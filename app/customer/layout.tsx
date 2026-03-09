'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SideNav, BottomNav, TopBar } from '@/components/navigation';
import { useAuth } from '@/lib/hooks';
import { SidebarProvider, useSidebar } from '@/lib/contexts';
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/customer/dashboard': 'Dashboard',
  '/customer/find': 'Find Pros',
  '/customer/projects': 'My Projects',
  '/customer/book': 'Book a Pro',
  '/customer/settings': 'Settings',
};

function CustomerContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { isCollapsed } = useSidebar();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.status === 'pending') {
        router.push('/pending');
      } else if (user.status === 'suspended') {
        router.push('/login');
      } else if (user.role !== 'customer') {
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

  if (!user || user.status !== 'active' || user.role !== 'customer') {
    return null;
  }

  const getPageTitle = () => {
    if (PAGE_TITLES[pathname]) {
      return PAGE_TITLES[pathname];
    }
    for (const [path, title] of Object.entries(PAGE_TITLES)) {
      if (pathname.startsWith(path) && path !== '/customer') {
        return title;
      }
    }
    return 'Customer Portal';
  };

  return (
    <div className="min-h-screen bg-brand-black">
      <SideNav />

      <div
        className={cn(
          "transition-all duration-300",
          isCollapsed ? "md:pl-16" : "md:pl-64"
        )}
      >
        <TopBar title={getPageTitle()} />

        <main className="p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <CustomerContent>{children}</CustomerContent>
    </SidebarProvider>
  );
}
