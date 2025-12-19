'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wrench,
  Building2,
  Target,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/overview', icon: LayoutDashboard },
  { label: 'KTS', href: '/kts', icon: Wrench },
  { label: 'KR', href: '/kr', icon: Building2 },
  { label: 'KD', href: '/kd', icon: Target },
  { label: 'Profile', href: '/profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Filter items based on user role for mobile
  const filteredItems = navItems.filter((item) => {
    // Show profile for everyone
    if (item.href === '/profile') return true;
    // Show overview for everyone
    if (item.href === '/overview') return true;
    // KTS visible to internal roles
    if (item.href === '/kts') return true;
    // KR visible to internal roles
    if (item.href === '/kr') return true;
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
