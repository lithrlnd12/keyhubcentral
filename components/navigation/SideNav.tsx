'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Settings,
  Cog,
  LogOut,
  Building2,
  Wrench,
  Target,
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
  Phone,
  MessageSquare,
  CreditCard,
  FolderOpen,
  BarChart3,
  Brain,
  Store,
  Zap,
  Mail,
  Webhook,
} from 'lucide-react';
import { Logo } from '@/components/ui';
import { useAuth, useNewCallsCount, useFeatureFlags } from '@/lib/hooks';
import { useUnreadMessageCount } from '@/lib/hooks/useMessages';
import { useSidebar } from '@/lib/contexts';
import { cn } from '@/lib/utils';
import { canManageUsers, canViewFinancials, canManageCampaigns, canManagePartnerRequests, isPartner, canViewInventory, UserRole } from '@/types/user';
import { tenant } from '@/lib/config/tenant';
import type { FeatureFlags } from '@/types/featureFlags';

// Role helpers
const isContractor = (role: UserRole): boolean => role === 'contractor';
const isSubscriber = (role: UserRole): boolean => role === 'subscriber';
const isCustomerRole = (role: UserRole): boolean => role === 'customer';
const isInternalStaff = (role: UserRole): boolean => !['contractor', 'subscriber', 'partner', 'customer'].includes(role);
const canAccessSettings = (role: UserRole): boolean =>
  ['owner', 'admin', 'pm', 'sales_rep'].includes(role);

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: (role: UserRole) => boolean;
  badgeKey?: 'newCalls' | 'unreadMessages';
  section: 'main' | 'work' | 'communicate' | 'finance' | 'admin';
  featureFlag?: keyof FeatureFlags;
}

const navItems: NavItem[] = [
  // ── MAIN ──
  { label: 'Overview', href: '/overview', icon: LayoutDashboard, permission: isInternalStaff, section: 'main' },
  { label: 'Dashboard', href: '/portal', icon: LayoutDashboard, permission: isContractor, section: 'main' },
  { label: 'Dashboard', href: '/partner', icon: LayoutDashboard, permission: isPartner, section: 'main' },
  { label: 'My Leads', href: '/subscriber', icon: Users, permission: isSubscriber, section: 'main' },
  { label: 'Dashboard', href: '/customer/dashboard', icon: LayoutDashboard, permission: isCustomerRole, section: 'main' },

  // ── WORK ──
  { label: tenant.entities.kts.label, href: '/kts', icon: Wrench, permission: isInternalStaff, section: 'work' },
  { label: 'Calls', href: '/kts/calls', icon: Phone, permission: isInternalStaff, badgeKey: 'newCalls', section: 'work', featureFlag: 'callCenter' },
  { label: 'Inventory', href: '/kts/inventory', icon: Package, permission: (r) => isInternalStaff(r) && canViewInventory(r), section: 'work', featureFlag: 'inventory' },
  { label: 'Receipts', href: '/kts/inventory/receipts', icon: Receipt, permission: (r) => isInternalStaff(r) && canViewInventory(r), section: 'work', featureFlag: 'inventory' },
  { label: tenant.entities.kr.label, href: '/kr', icon: Building2, permission: isInternalStaff, section: 'work', featureFlag: 'contracts' },
  { label: tenant.entities.kd.label, href: '/kd', icon: Target, permission: canManageCampaigns, section: 'work', featureFlag: 'leadEngine' },
  { label: 'Calendar', href: '/calendar', icon: Calendar, permission: isInternalStaff, section: 'work' },
  { label: 'Smart Schedule', href: '/calendar/smart-schedule', icon: Zap, permission: (r) => ['owner', 'admin', 'pm'].includes(r), section: 'work', featureFlag: 'smartScheduling' },
  { label: 'Marketplace', href: '/kts/marketplace', icon: Store, permission: (r) => ['owner', 'admin', 'pm'].includes(r), section: 'work', featureFlag: 'marketplace' },
  // Contractor work
  { label: 'Available Jobs', href: '/portal/leads', icon: Target, permission: isContractor, section: 'work' },
  { label: 'Calendar', href: '/portal/calendar', icon: Calendar, permission: isContractor, section: 'work' },
  { label: 'My Jobs', href: '/portal/jobs', icon: Briefcase, permission: isContractor, section: 'work' },
  { label: 'Inventory', href: '/portal/inventory', icon: Package, permission: isContractor, section: 'work', featureFlag: 'inventory' },
  { label: 'Marketplace', href: '/portal/marketplace', icon: Store, permission: isContractor, section: 'work', featureFlag: 'marketplace' },
  // Partner work
  { label: 'Labor Requests', href: '/partner/labor-requests', icon: Wrench, permission: isPartner, section: 'work' },
  { label: 'Service Tickets', href: '/partner/service-tickets', icon: ClipboardList, permission: isPartner, section: 'work' },
  { label: 'History', href: '/partner/history', icon: History, permission: isPartner, section: 'work' },
  // Subscriber work
  { label: 'Subscription', href: '/subscriber/subscription', icon: CreditCard, permission: isSubscriber, section: 'work' },
  // Customer work
  { label: 'Find Pros', href: '/customer/find', icon: Target, permission: isCustomerRole, section: 'work', featureFlag: 'customerPortal' },
  { label: 'My Projects', href: '/customer/projects', icon: Briefcase, permission: isCustomerRole, section: 'work', featureFlag: 'customerPortal' },
  { label: 'Book a Pro', href: '/customer/book', icon: ClipboardList, permission: isCustomerRole, section: 'work', featureFlag: 'customerPortal' },

  // ── COMMUNICATE ──
  { label: 'Messages', href: '/messages', icon: MessageSquare, badgeKey: 'unreadMessages', section: 'communicate', featureFlag: 'communications' },

  // ── FINANCE ──
  { label: 'Financials', href: '/financials', icon: FileText, permission: canViewFinancials, section: 'finance', featureFlag: 'financials' },
  { label: 'Financials', href: '/portal/financials', icon: DollarSign, permission: isContractor, section: 'finance', featureFlag: 'financials' },

  // ── ADMIN ──
  { label: 'Partners', href: '/admin/partners', icon: Briefcase, permission: canManagePartnerRequests, section: 'admin' },
  { label: 'Partner Requests', href: '/admin/partner-requests', icon: Users, permission: canManagePartnerRequests, section: 'admin' },
  { label: 'Job History', href: '/admin/job-history', icon: FolderOpen, permission: canManageUsers, section: 'admin' },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3, permission: canManageUsers, section: 'admin', featureFlag: 'reportBuilder' },
  { label: 'Analytics', href: '/admin/analytics', icon: Brain, permission: canManageUsers, section: 'admin', featureFlag: 'predictiveAnalytics' },
  { label: 'Email', href: '/settings/email', icon: Mail, permission: canManageUsers, section: 'admin', featureFlag: 'emailAutomation' },
  { label: 'Webhooks', href: '/settings/webhooks', icon: Webhook, permission: canManageUsers, section: 'admin', featureFlag: 'webhooksAPI' },
  { label: 'Admin', href: '/admin', icon: Settings, permission: canManageUsers, section: 'admin' },
];

const SECTION_LABELS: Record<string, string> = {
  main: '',
  work: 'Work',
  communicate: 'Connect',
  finance: 'Finance',
  admin: 'Admin',
};

// Footer items (Profile, Settings) rendered separately in user section
interface FooterItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: (role: UserRole) => boolean;
}

const footerItems: FooterItem[] = [
  { label: 'Profile', href: '/profile', icon: User, permission: (r) => isInternalStaff(r) || isSubscriber(r) || isCustomerRole(r) },
  { label: 'Profile', href: '/portal/my-profile', icon: User, permission: isContractor },
  { label: 'Settings', href: '/settings', icon: Cog, permission: (r) => canAccessSettings(r) && !isContractor(r) },
  { label: 'Settings', href: '/portal/settings', icon: Cog, permission: isContractor },
];

export function SideNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { isCollapsed, isMobileOpen, toggleCollapsed, closeMobile } = useSidebar();
  const { count: newCallsCount } = useNewCallsCount();
  const unreadMessages = useUnreadMessageCount();
  const { flags } = useFeatureFlags();

  const badgeCounts: Record<string, number> = {
    newCalls: newCallsCount,
    unreadMessages,
  };

  const filteredNavItems = navItems.filter((item) => {
    // Check role permission
    if (item.permission && (!user?.role || !item.permission(user.role))) return false;
    // Check feature flag
    if (item.featureFlag && !flags[item.featureFlag]) return false;
    return true;
  });

  const filteredFooterItems = footerItems.filter(
    (item) => !item.permission || (user?.role && item.permission(user.role))
  );

  // Group items by section
  const sections = ['main', 'work', 'communicate', 'finance', 'admin'] as const;
  const grouped = sections
    .map((section) => ({
      key: section,
      label: SECTION_LABELS[section],
      items: filteredNavItems.filter((item) => item.section === section),
    }))
    .filter((section) => section.items.length > 0);

  // Get home href for logo link
  const homeHref = user?.role === 'customer' ? '/customer/dashboard'
    : user?.role === 'contractor' ? '/portal'
    : user?.role === 'partner' ? '/partner'
    : user?.role === 'subscriber' ? '/subscriber'
    : '/overview';

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 border-b border-gray-800 transition-all duration-300",
        isCollapsed ? "px-2 justify-center" : "px-4 justify-between"
      )}>
        <Link href={homeHref} onClick={closeMobile}>
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
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
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
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {grouped.map((section, sectionIdx) => (
          <div key={section.key} className={sectionIdx > 0 ? 'mt-4' : ''}>
            {/* Section header */}
            {section.label && !isCollapsed && (
              <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider px-3 mb-1.5">
                {section.label}
              </p>
            )}
            {section.label && isCollapsed && sectionIdx > 0 && (
              <div className="h-px bg-gray-800 mx-2 mb-2" />
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isCollapsed ? 'px-2 justify-center' : 'px-3',
                      isActive
                        ? 'bg-brand-gold/10 text-brand-gold'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <Icon className="w-5 h-5" />
                      {badgeCount > 0 && isCollapsed && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-gold rounded-full text-[10px] font-bold text-brand-black flex items-center justify-center">
                          {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1">{item.label}</span>
                        {badgeCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-brand-gold/15 text-brand-gold text-xs font-semibold rounded-full">
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className={cn(
        "border-t border-gray-800 transition-all duration-300",
        isCollapsed ? "p-2" : "px-2 py-3"
      )}>
        {/* Footer nav items (Profile, Settings) */}
        {filteredFooterItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isCollapsed ? 'px-2 justify-center' : 'px-3',
                isActive
                  ? 'bg-brand-gold/10 text-brand-gold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Divider before user info */}
        <div className={cn("my-2", isCollapsed ? "mx-1" : "mx-2")}>
          <div className="h-px bg-gray-800" />
        </div>

        {/* User info */}
        {!isCollapsed && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-brand-charcoal flex items-center justify-center flex-shrink-0">
              <span className="text-brand-gold font-medium text-sm">
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.displayName || 'User'}
              </p>
              <p className="text-[11px] text-gray-500 capitalize">
                {user?.role?.replace('_', ' ') || 'Loading...'}
              </p>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="flex justify-center mb-1">
            <div className="w-9 h-9 rounded-full bg-brand-charcoal flex items-center justify-center">
              <span className="text-brand-gold font-medium text-sm">
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => signOut()}
          title={isCollapsed ? 'Sign out' : undefined}
          className={cn(
            "flex items-center gap-2 w-full py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors",
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
