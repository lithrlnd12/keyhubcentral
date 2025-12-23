'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Calendar, User, LogOut, Home, Briefcase, DollarSign } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/lib/hooks';

const NAV_ITEMS = [
  { href: '/portal', label: 'Dashboard', icon: Home },
  { href: '/portal/availability', label: 'Availability', icon: Calendar },
  { href: '/portal/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/portal/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/portal/my-profile', label: 'Profile', icon: User },
];

export default function PortalLayout({
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
      } else if (user.role !== 'contractor') {
        // Non-contractors should use the main dashboard
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

  if (!user || user.status !== 'active' || user.role !== 'contractor') {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-black">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <span className="text-gray-400 text-sm hidden sm:block">Contractor Portal</span>
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
                (item.href !== '/portal' && pathname.startsWith(item.href));
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
