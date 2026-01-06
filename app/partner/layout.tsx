'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Wrench, ClipboardList, History, LogOut, Building2 } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/lib/hooks';

const NAV_ITEMS = [
  { href: '/partner', label: 'Dashboard', icon: Home },
  { href: '/partner/labor-requests', label: 'Labor Requests', icon: Wrench },
  { href: '/partner/service-tickets', label: 'Service Tickets', icon: ClipboardList },
  { href: '/partner/history', label: 'History', icon: History },
];

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.status === 'pending') {
        router.push('/pending');
      } else if (user.status === 'suspended') {
        router.push('/login');
      } else if (user.role !== 'partner') {
        // Non-partners should use the appropriate portal
        router.push('/overview');
      }
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.status !== 'active' || user.role !== 'partner') {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:block">Partner Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm hidden sm:block">{user.displayName}</span>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-900/50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/partner' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'text-gold border-gold'
                      : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
