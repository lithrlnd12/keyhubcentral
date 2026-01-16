'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Megaphone,
  FileText,
  Settings,
  Cog,
  LogOut,
  Building2,
  Wrench,
  Target,
  UserCircle,
  Package,
  Receipt,
  Calendar,
  DollarSign,
  User,
  ClipboardList,
  History,
} from 'lucide-react';
import { Logo } from '@/components/ui';
import { useAuth } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { canManageUsers, canViewFinancials, canManageCampaigns, canManagePartnerRequests, isPartner, canViewInventory, UserRole } from '@/types/user';

// Contractor can access portal
const isContractor = (role: UserRole): boolean => role === 'contractor';

// Subscriber can access subscriber portal
const isSubscriber = (role: UserRole): boolean => role === 'subscriber';

// Non-contractors and non-subscribers (internal staff)
const isInternalStaff = (role: UserRole): boolean => !['contractor', 'subscriber'].includes(role);

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: (role: UserRole) => boolean;
}

// Can access settings (staff with calendar sync capability)
const canAccessSettings = (role: UserRole): boolean =>
  ['owner', 'admin', 'pm', 'sales_rep'].includes(role);

const navItems: NavItem[] = [
  // Internal staff items
  { label: 'Overview', href: '/overview', icon: LayoutDashboard, permission: isInternalStaff },
  { label: 'KTS', href: '/kts', icon: Wrench, permission: isInternalStaff },
  { label: 'Inventory', href: '/kts/inventory', icon: Package, permission: canViewInventory },
  { label: 'Receipts', href: '/kts/inventory/receipts', icon: Receipt, permission: canViewInventory },
  { label: 'Key Renovations', href: '/kr', icon: Building2, permission: isInternalStaff },
  { label: 'Keynote Digital', href: '/kd', icon: Target, permission: canManageCampaigns },
  { label: 'Financials', href: '/financials', icon: FileText, permission: canViewFinancials },
  { label: 'Partners', href: '/admin/partners', icon: Briefcase, permission: canManagePartnerRequests },
  { label: 'Partner Requests', href: '/admin/partner-requests', icon: Users, permission: canManagePartnerRequests },
  { label: 'Admin', href: '/admin', icon: Settings, permission: canManageUsers },
  { label: 'Settings', href: '/settings', icon: Cog, permission: canAccessSettings },

  // Contractor portal items
  { label: 'Dashboard', href: '/portal', icon: LayoutDashboard, permission: isContractor },
  { label: 'Availability', href: '/portal/availability', icon: Calendar, permission: isContractor },
  { label: 'My Jobs', href: '/portal/jobs', icon: Briefcase, permission: isContractor },
  { label: 'Financials', href: '/portal/financials', icon: DollarSign, permission: isContractor },
  { label: 'Inventory', href: '/portal/inventory', icon: Package, permission: isContractor },
  { label: 'Profile', href: '/portal/my-profile', icon: User, permission: isContractor },
  { label: 'Settings', href: '/portal/settings', icon: Cog, permission: isContractor },

  // Partner portal items
  { label: 'Dashboard', href: '/partner', icon: LayoutDashboard, permission: isPartner },
  { label: 'Labor Requests', href: '/partner/labor-requests', icon: Wrench, permission: isPartner },
  { label: 'Service Tickets', href: '/partner/service-tickets', icon: ClipboardList, permission: isPartner },
  { label: 'History', href: '/partner/history', icon: History, permission: isPartner },

  // Subscriber items
  { label: 'My Leads', href: '/subscriber', icon: Users, permission: isSubscriber },
];

export function SideNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const filteredNavItems = navItems.filter(
    (item) => !item.permission || (user?.role && item.permission(user.role))
  );

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-brand-black border-r border-gray-800">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-800">
        <Link href="/overview">
          <Logo size="sm" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-gold/10 text-brand-gold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-brand-charcoal flex items-center justify-center">
            <span className="text-brand-gold font-medium">
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.displayName || 'User'}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {user?.role?.replace('_', ' ') || 'Loading...'}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
