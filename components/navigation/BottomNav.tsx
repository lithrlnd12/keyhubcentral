'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wrench,
  Building2,
  Target,
  User,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Internal staff nav items
const internalNavItems: NavItem[] = [
  { label: 'Home', href: '/overview', icon: LayoutDashboard },
  { label: 'KTS', href: '/kts', icon: Wrench },
  { label: 'KR', href: '/kr', icon: Building2 },
  { label: 'KD', href: '/kd', icon: Target },
  { label: 'Profile', href: '/profile', icon: User },
];

// Contractor nav items
const contractorNavItems: NavItem[] = [
  { label: 'Portal', href: '/portal', icon: UserCircle },
  { label: 'Jobs', href: '/portal/jobs', icon: Wrench },
  { label: 'Calendar', href: '/portal/availability', icon: LayoutDashboard },
  { label: 'Profile', href: '/profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isContractor = user?.role === 'contractor';

  // Get appropriate nav items based on role
  const baseItems = isContractor ? contractorNavItems : internalNavItems;

  // Filter items based on user role for mobile
  const filteredItems = baseItems.filter((item) => {
    // Show profile for everyone
    if (item.href === '/profile') return true;
    // For contractors, show all contractor items
    if (isContractor) return true;
    // KD only for admin roles
    if (item.href === '/kd') {
      return user?.role && ['owner', 'admin'].includes(user.role);
    }
    return true;
  });

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-black border-t border-gray-800 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {filteredItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full px-2 transition-colors',
                isActive ? 'text-brand-gold' : 'text-gray-500'
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
