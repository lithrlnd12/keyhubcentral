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
  MessageSquare,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks';
import { useUnreadMessageCount } from '@/lib/hooks/useMessages';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: 'unreadMessages';
}

// Internal staff nav items
const internalNavItems: NavItem[] = [
  { label: 'Home', href: '/overview', icon: LayoutDashboard },
  { label: 'KTS', href: '/kts', icon: Wrench },
  { label: 'Messages', href: '/messages', icon: MessageSquare, badgeKey: 'unreadMessages' },
  { label: 'Calls', href: '/kts/calls', icon: Phone },
  { label: 'Profile', href: '/profile', icon: User },
];

// Contractor nav items
const contractorNavItems: NavItem[] = [
  { label: 'Home', href: '/portal', icon: LayoutDashboard },
  { label: 'Calendar', href: '/portal/calendar', icon: Calendar },
  { label: 'Messages', href: '/messages', icon: MessageSquare, badgeKey: 'unreadMessages' },
  { label: 'Jobs', href: '/portal/jobs', icon: Wrench },
  { label: 'More', href: '/portal/my-profile', icon: User },
];

// Subscriber nav items
const subscriberNavItems: NavItem[] = [
  { label: 'Home', href: '/subscriber', icon: LayoutDashboard },
  { label: 'Leads', href: '/subscriber/leads', icon: Users },
  { label: 'Messages', href: '/messages', icon: MessageSquare, badgeKey: 'unreadMessages' },
  { label: 'Plan', href: '/subscriber/subscription', icon: CreditCard },
  { label: 'Profile', href: '/profile', icon: User },
];

// Partner nav items
const partnerNavItems: NavItem[] = [
  { label: 'Home', href: '/partner', icon: LayoutDashboard },
  { label: 'Labor', href: '/partner/labor-requests', icon: Wrench },
  { label: 'Messages', href: '/messages', icon: MessageSquare, badgeKey: 'unreadMessages' },
  { label: 'Service', href: '/partner/service-tickets', icon: ClipboardList },
  { label: 'History', href: '/partner/history', icon: History },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const unreadMessages = useUnreadMessageCount();

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
          const badgeCount = item.badgeKey === 'unreadMessages' ? unreadMessages : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full px-2 transition-colors',
                isActive ? 'text-brand-gold' : 'text-gray-500'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5 mb-1" />
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-blue-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-0.5">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => signOut()}
          className="flex flex-col items-center justify-center flex-1 h-full px-2 transition-colors text-gray-500"
        >
          <LogOut className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">Sign Out</span>
        </button>
      </div>
    </nav>
  );
}
