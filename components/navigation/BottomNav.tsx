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
  Users,
  CreditCard,
  ClipboardList,
  History,
  Package,
  Calendar,
  DollarSign,
  Phone,
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
  { label: 'Calls', href: '/kts/calls', icon: Phone },
  { label: 'KD', href: '/kd', icon: Target },
  { label: 'Profile', href: '/profile', icon: User },
];

// Contractor nav items
const contractorNavItems: NavItem[] = [
  { label: 'Home', href: '/portal', icon: LayoutDashboard },
  { label: 'Calendar', href: '/portal/calendar', icon: Calendar },
  { label: 'Jobs', href: '/portal/jobs', icon: Wrench },
  { label: 'Money', href: '/portal/financials', icon: DollarSign },
  { label: 'More', href: '/portal/my-profile', icon: User },
];

// Subscriber nav items
const subscriberNavItems: NavItem[] = [
  { label: 'Home', href: '/subscriber', icon: LayoutDashboard },
  { label: 'Leads', href: '/subscriber/leads', icon: Users },
  { label: 'Plan', href: '/subscriber/subscription', icon: CreditCard },
  { label: 'Profile', href: '/profile', icon: User },
];

// Partner nav items
const partnerNavItems: NavItem[] = [
  { label: 'Home', href: '/partner', icon: LayoutDashboard },
  { label: 'Labor', href: '/partner/labor-requests', icon: Wrench },
  { label: 'Service', href: '/partner/service-tickets', icon: ClipboardList },
  { label: 'History', href: '/partner/history', icon: History },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isContractor = user?.role === 'contractor';
  const isSubscriber = user?.role === 'subscriber';
  const isPartner = user?.role === 'partner';

  // Get appropriate nav items based on role
  const baseItems = isContractor
    ? contractorNavItems
    : isSubscriber
    ? subscriberNavItems
    : isPartner
    ? partnerNavItems
    : internalNavItems;

  // Filter items based on user role for mobile
  const filteredItems = baseItems.filter((item) => {
    // Show profile for everyone
    if (item.href === '/profile') return true;
    // For contractors, show all contractor items
    if (isContractor) return true;
    // For subscribers, show all subscriber items
    if (isSubscriber) return true;
    // For partners, show all partner items
    if (isPartner) return true;
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
