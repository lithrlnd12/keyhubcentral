'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User,
  Cog,
  LogOut,
  DollarSign,
  FileText,
  Package,
  Receipt,
  Calendar,
  Phone,
  Building2,
  Target,
  Briefcase,
  Users,
  Settings,
  ClipboardList,
  History,
  CreditCard,
  MapPin,
  Store,
  Zap,
  MessageSquare,
  FolderOpen,
  BarChart3,
  Brain,
  Mail,
  Webhook,
} from 'lucide-react';
import { useAuth, useFeatureFlags } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { tenant } from '@/lib/config/tenant';
import type { UserRole } from '@/types/user';
import type { FeatureFlags } from '@/types/featureFlags';

interface MoreMenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: (role: UserRole) => boolean;
  section: 'shortcuts' | 'enterprise' | 'admin' | 'account';
  featureFlag?: keyof FeatureFlags;
}

const canViewFinancials = (role: UserRole) => ['owner', 'admin', 'pm'].includes(role);
const canViewInventory = (role: UserRole) => ['owner', 'admin', 'pm', 'contractor'].includes(role);
const canManageCampaigns = (role: UserRole) => ['owner', 'admin'].includes(role);
const canManagePartnerRequests = (role: UserRole) => ['owner', 'admin'].includes(role);
const canManageUsers = (role: UserRole) => ['owner', 'admin'].includes(role);
const isInternalStaff = (role: UserRole) => !['contractor', 'subscriber', 'partner', 'customer'].includes(role);
const isContractor = (role: UserRole) => role === 'contractor';
const isPartner = (role: UserRole) => role === 'partner';
const isSubscriber = (role: UserRole) => role === 'subscriber';
const isCustomerRole = (role: UserRole) => role === 'customer';
const canAccessSettings = (role: UserRole) => ['owner', 'admin', 'pm', 'sales_rep', 'contractor'].includes(role);

const menuItems: MoreMenuItem[] = [
  // ── SHORTCUTS ──
  // Internal staff shortcuts
  { label: 'Calls', href: '/kts/calls', icon: Phone, permission: isInternalStaff, section: 'shortcuts', featureFlag: 'callCenter' },
  { label: 'Inventory', href: '/kts/inventory', icon: Package, permission: (r) => isInternalStaff(r) && canViewInventory(r), section: 'shortcuts', featureFlag: 'inventory' },
  { label: 'Receipts', href: '/kts/inventory/receipts', icon: Receipt, permission: (r) => isInternalStaff(r) && canViewInventory(r), section: 'shortcuts', featureFlag: 'inventory' },
  { label: tenant.entities.kr.label, href: '/kr', icon: Building2, permission: isInternalStaff, section: 'shortcuts', featureFlag: 'contracts' },
  { label: tenant.entities.kd.label, href: '/kd', icon: Target, permission: canManageCampaigns, section: 'shortcuts', featureFlag: 'leadEngine' },
  { label: 'Calendar', href: '/calendar', icon: Calendar, permission: isInternalStaff, section: 'shortcuts' },
  { label: 'Messages', href: '/messages', icon: MessageSquare, section: 'shortcuts', featureFlag: 'communications' },

  // Contractor shortcuts
  { label: 'Calendar', href: '/portal/calendar', icon: Calendar, permission: isContractor, section: 'shortcuts' },
  { label: 'My Jobs', href: '/portal/jobs', icon: Briefcase, permission: isContractor, section: 'shortcuts' },
  { label: 'Inventory', href: '/portal/inventory', icon: Package, permission: isContractor, section: 'shortcuts', featureFlag: 'inventory' },
  { label: 'Marketplace', href: '/portal/marketplace', icon: Store, permission: isContractor, section: 'shortcuts', featureFlag: 'marketplace' },

  // Partner shortcuts
  { label: 'Service Tickets', href: '/partner/service-tickets', icon: ClipboardList, permission: isPartner, section: 'shortcuts' },
  { label: 'History', href: '/partner/history', icon: History, permission: isPartner, section: 'shortcuts' },

  // Subscriber shortcuts
  { label: 'Subscription', href: '/subscriber/subscription', icon: CreditCard, permission: isSubscriber, section: 'shortcuts' },

  // Customer shortcuts
  { label: 'Find Pros', href: '/customer/find', icon: Target, permission: isCustomerRole, section: 'shortcuts', featureFlag: 'customerPortal' },
  { label: 'My Projects', href: '/customer/projects', icon: Briefcase, permission: isCustomerRole, section: 'shortcuts', featureFlag: 'customerPortal' },
  { label: 'Book a Pro', href: '/customer/book', icon: ClipboardList, permission: isCustomerRole, section: 'shortcuts', featureFlag: 'customerPortal' },

  // ── ENTERPRISE ──
  { label: 'Smart Schedule', href: '/calendar/smart-schedule', icon: Zap, permission: (r) => ['owner', 'admin', 'pm'].includes(r), section: 'enterprise', featureFlag: 'smartScheduling' },
  { label: 'Marketplace', href: '/kts/marketplace', icon: Store, permission: (r) => ['owner', 'admin', 'pm'].includes(r), section: 'enterprise', featureFlag: 'marketplace' },

  // ── ADMIN ──
  { label: 'Financials', href: '/financials', icon: FileText, permission: canViewFinancials, section: 'admin', featureFlag: 'financials' },
  { label: 'Financials', href: '/portal/financials', icon: DollarSign, permission: isContractor, section: 'admin', featureFlag: 'financials' },
  { label: 'Partners', href: '/admin/partners', icon: Briefcase, permission: canManagePartnerRequests, section: 'admin' },
  { label: 'Partner Requests', href: '/admin/partner-requests', icon: Users, permission: canManagePartnerRequests, section: 'admin' },
  { label: 'Job History', href: '/admin/job-history', icon: FolderOpen, permission: canManageUsers, section: 'admin' },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3, permission: canManageUsers, section: 'admin', featureFlag: 'reportBuilder' },
  { label: 'Analytics', href: '/admin/analytics', icon: Brain, permission: canManageUsers, section: 'admin', featureFlag: 'predictiveAnalytics' },
  { label: 'Email Automation', href: '/settings/email', icon: Mail, permission: canManageUsers, section: 'admin', featureFlag: 'emailAutomation' },
  { label: 'Webhooks', href: '/settings/webhooks', icon: Webhook, permission: canManageUsers, section: 'admin', featureFlag: 'webhooksAPI' },
  { label: 'Admin', href: '/admin', icon: Settings, permission: canManageUsers, section: 'admin' },

  // ── ACCOUNT ──
  { label: 'Profile', href: '/profile', icon: User, permission: (r) => isInternalStaff(r) || isSubscriber(r) || isCustomerRole(r), section: 'account' },
  { label: 'Profile', href: '/portal/my-profile', icon: User, permission: isContractor, section: 'account' },
  { label: 'Settings', href: '/settings', icon: Cog, permission: (r) => canAccessSettings(r) && !isContractor(r), section: 'account' },
  { label: 'Settings', href: '/portal/settings', icon: Cog, permission: isContractor, section: 'account' },
];

const SECTION_LABELS: Record<string, string> = {
  shortcuts: 'Quick Access',
  enterprise: 'Enterprise',
  admin: 'Admin',
  account: 'Account',
};

interface MoreMenuProps {
  onClose: () => void;
}

export function MoreMenu({ onClose }: MoreMenuProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { flags } = useFeatureFlags();

  const filteredItems = menuItems.filter((item) => {
    // Check role permission
    if (item.permission && (!user?.role || !item.permission(user.role))) return false;
    // Check feature flag
    if (item.featureFlag && !flags[item.featureFlag]) return false;
    return true;
  });

  // Group by section
  const sections = ['shortcuts', 'enterprise', 'admin', 'account'] as const;
  const grouped = sections
    .map((section) => ({
      key: section,
      label: SECTION_LABELS[section],
      items: filteredItems.filter((item) => item.section === section),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="space-y-1">
      {/* User card */}
      <div className="flex items-center gap-3 px-3 py-3 mb-2">
        <div className="w-11 h-11 rounded-full bg-brand-charcoal flex items-center justify-center flex-shrink-0 ring-2 ring-brand-gold/20">
          <span className="text-brand-gold font-semibold text-lg">
            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {user?.displayName || 'User'}
          </p>
          <p className="text-xs text-gray-500 capitalize">
            {user?.role?.replace('_', ' ') || 'Loading...'}
          </p>
        </div>
      </div>

      {/* Sections */}
      {grouped.map((section, sectionIdx) => (
        <div key={section.key}>
          {sectionIdx > 0 && <div className="h-px bg-gray-800 mx-3 my-2" />}
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-1.5">
            {section.label}
          </p>
          {section.items.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl mx-1 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-gold/10 text-brand-gold'
                    : 'text-gray-300 active:bg-white/5'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}

      {/* Sign Out */}
      <div className="h-px bg-gray-800 mx-3 my-2" />
      <button
        onClick={() => {
          onClose();
          signOut();
        }}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl mx-1 text-sm font-medium text-red-400 active:bg-red-500/10 transition-colors w-full"
      >
        <LogOut className="w-5 h-5 flex-shrink-0" />
        <span>Sign Out</span>
      </button>
    </div>
  );
}
