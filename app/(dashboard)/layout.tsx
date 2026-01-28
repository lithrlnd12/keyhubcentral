'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SideNav, BottomNav, TopBar } from '@/components/navigation';
import { AIChatWidget } from '@/components/chat';
import { useAuth } from '@/lib/hooks';
import { SidebarProvider, useSidebar } from '@/lib/contexts';
import { ADMIN_ROLES, UserRole } from '@/types/user';
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/overview': 'Dashboard',
  '/kts': 'Key Trade Solutions',
  '/kr': 'Key Renovations',
  '/kd': 'Keynote Digital',
  '/financials': 'Financials',
  '/admin': 'Admin',
  '/profile': 'Profile',
  '/settings': 'Settings',
};

// Roles that should use the main dashboard (not special portals)
const DASHBOARD_ROLES: UserRole[] = ['owner', 'admin', 'sales_rep', 'pm'];

// Routes that require admin role
const ADMIN_ONLY_ROUTES = ['/admin'];

// Routes that require admin role for full access
const ADMIN_FINANCIAL_ROUTES = ['/financials/pnl', '/financials/payouts'];

// Check if user can access the current route based on their role
function canAccessRoute(role: UserRole, pathname: string): boolean {
  // Subscriber can only access /subscriber routes
  if (role === 'subscriber') {
    return pathname.startsWith('/subscriber');
  }

  // Admin-only routes
  if (ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route))) {
    return ADMIN_ROLES.includes(role);
  }

  // Admin-only financial routes
  if (ADMIN_FINANCIAL_ROUTES.some(route => pathname.startsWith(route))) {
    return ADMIN_ROLES.includes(role);
  }

  // KD campaigns - admin only
  if (pathname.startsWith('/kd/campaigns')) {
    return ADMIN_ROLES.includes(role);
  }

  // Subscriber routes - block non-subscribers (subscribers already handled above)
  if (pathname.startsWith('/subscriber')) {
    return false;
  }

  return true;
}

// Get the appropriate redirect for a role
function getRedirectForRole(role: UserRole): string {
  switch (role) {
    case 'contractor':
      return '/portal';
    case 'subscriber':
      return '/subscriber';
    case 'partner':
      return '/partner';
    default:
      return '/overview';
  }
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { isCollapsed } = useSidebar();

  useEffect(() => {
    if (!loading && user) {
      // Check authentication and status first
      if (user.status === 'pending') {
        router.push('/pending');
        return;
      }
      if (user.status === 'suspended') {
        router.push('/login');
        return;
      }

      // Contractors and partners have separate layouts - redirect them
      if (user.role === 'contractor') {
        router.push('/portal');
        return;
      }
      if (user.role === 'partner') {
        router.push('/partner');
        return;
      }

      // Subscriber trying to access non-subscriber routes
      if (user.role === 'subscriber' && !pathname.startsWith('/subscriber')) {
        router.push('/subscriber');
        return;
      }

      // Check route permissions for dashboard users
      if (!canAccessRoute(user.role, pathname)) {
        router.push('/overview');
        return;
      }
    } else if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

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

  // Don't render for roles that have their own separate layouts
  if (['contractor', 'partner'].includes(user.role)) {
    return null;
  }

  // Don't render if user doesn't have permission for this route
  if (!canAccessRoute(user.role, pathname)) {
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

      {/* Main content area - adjusts based on sidebar state */}
      <div
        className={cn(
          "transition-all duration-300",
          isCollapsed ? "md:pl-16" : "md:pl-64"
        )}
      >
        {/* Top bar */}
        <TopBar title={getPageTitle()} />

        {/* Page content */}
        <main className="p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />

      {/* AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
