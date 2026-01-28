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
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Logo } from '@/components/ui';
import { useAuth } from '@/lib/hooks';
import { useSidebar } from '@/lib/contexts';
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
  const { isCollapsed, isMobileOpen, toggleCollapsed, closeMobile } = useSidebar();

  const filteredNavItems = navItems.filter(
    (item) => !item.permission || (user?.role && item.permission(user.role))
  );

  // Sidebar content (shared between desktop and mobile)
  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 border-b border-gray-800 transition-all duration-300",
        isCollapsed ? "px-2 justify-center" : "px-4 justify-between"
      )}>
        <Link href="/overview" onClick={closeMobile}>
          {isCollapsed ? (
            <Logo size="sm" variant="icon" />
          ) : (
            <Logo size="sm" />
          )}
        </Link>

        {/* Desktop collapse button */}
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Mobile close button */}
        <button
          onClick={closeMobile}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isCollapsed ? 'px-2 justify-center' : 'px-3',
                isActive
                  ? 'bg-brand-gold/10 text-brand-gold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className={cn(
        "border-t border-gray-800 transition-all duration-300",
        isCollapsed ? "p-2" : "p-4"
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-brand-charcoal flex items-center justify-center flex-shrink-0">
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
        )}

        {isCollapsed && (
          <div className="flex justify-center mb-2">
            <div className="w-10 h-10 rounded-full bg-brand-charcoal flex items-center justify-center">
              <span className="text-brand-gold font-medium">
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => signOut()}
          title={isCollapsed ? 'Sign out' : undefined}
          className={cn(
            "flex items-center gap-2 w-full py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors",
            isCollapsed ? "px-2 justify-center" : "px-3"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-brand-black border-r border-gray-800 transition-all duration-300 z-40",
          isCollapsed ? "md:w-16" : "md:w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobile}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 w-64 bg-brand-black border-r border-gray-800 z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
