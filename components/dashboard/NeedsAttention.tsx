'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  UserCheck,
  Flame,
  Package,
  FileWarning,
  DollarSign,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useAuth, useLeads, useInvoices, useLowStockCount, useNotifications } from '@/lib/hooks';
import { ADMIN_ROLES } from '@/types/user';
import type { UserRole } from '@/types/user';

interface AttentionItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  priority: 'urgent' | 'high' | 'medium';
}

export function NeedsAttention() {
  const { user } = useAuth();
  const role = user?.role as UserRole;
  const isAdmin = role && ADMIN_ROLES.includes(role);

  const { leads, loading: leadsLoading } = useLeads({ realtime: true });
  const { invoices, loading: invoicesLoading } = useInvoices({ realtime: true });
  const { count: lowStockCount } = useLowStockCount();
  const { notifications } = useNotifications();

  const items = useMemo<AttentionItem[]>(() => {
    const result: AttentionItem[] = [];
    const now = new Date();

    // Pending user approvals (admin/owner only)
    if (isAdmin) {
      const pendingApprovals = notifications.filter(
        (n) => n.category === 'admin' && n.type === 'new_applicant' && n.status !== 'read'
      ).length;
      if (pendingApprovals > 0) {
        result.push({
          id: 'pending-approvals',
          title: `${pendingApprovals} pending approval${pendingApprovals !== 1 ? 's' : ''}`,
          description: 'New users waiting for account approval',
          icon: <UserCheck className="w-4 h-4 text-yellow-400" />,
          href: '/admin/users?status=pending',
          priority: 'high',
        });
      }
    }

    // Hot/unassigned leads (admin, sales_rep)
    if (isAdmin || role === 'sales_rep') {
      const unassignedLeads = leads.filter(
        (l) => l.status === 'new' && !l.assignedTo
      ).length;
      if (unassignedLeads > 0) {
        result.push({
          id: 'unassigned-leads',
          title: `${unassignedLeads} unassigned lead${unassignedLeads !== 1 ? 's' : ''}`,
          description: 'New leads need to be claimed or assigned',
          icon: <Flame className="w-4 h-4 text-orange-400" />,
          href: '/kd?status=new',
          priority: 'urgent',
        });
      }
    }

    // Overdue invoices
    if (isAdmin) {
      const overdueInvoices = invoices.filter((inv) => {
        if (inv.status === 'paid' || !inv.dueDate) return false;
        const dueDate = inv.dueDate instanceof Date ? inv.dueDate : inv.dueDate?.toDate?.();
        return dueDate && dueDate < now;
      });
      if (overdueInvoices.length > 0) {
        const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        result.push({
          id: 'overdue-invoices',
          title: `${overdueInvoices.length} overdue invoice${overdueInvoices.length !== 1 ? 's' : ''}`,
          description: `$${totalOverdue.toLocaleString()} past due`,
          icon: <DollarSign className="w-4 h-4 text-red-400" />,
          href: '/financials?overdue=true',
          priority: 'urgent',
        });
      }
    }

    // Draft invoices (admin)
    if (isAdmin) {
      const draftInvoices = invoices.filter((inv) => inv.status === 'draft').length;
      if (draftInvoices > 0) {
        result.push({
          id: 'draft-invoices',
          title: `${draftInvoices} draft invoice${draftInvoices !== 1 ? 's' : ''}`,
          description: 'Invoices ready to be sent',
          icon: <FileWarning className="w-4 h-4 text-yellow-400" />,
          href: '/financials/invoices?status=draft',
          priority: 'medium',
        });
      }
    }

    // Low stock items (admin, pm)
    if ((isAdmin || role === 'pm') && lowStockCount > 0) {
      result.push({
        id: 'low-stock',
        title: `${lowStockCount} low stock item${lowStockCount !== 1 ? 's' : ''}`,
        description: 'Inventory items below par level',
        icon: <Package className="w-4 h-4 text-amber-400" />,
        href: '/kts/inventory/alerts',
        priority: 'medium',
      });
    }

    // Compliance notifications (admin)
    if (isAdmin) {
      const complianceAlerts = notifications.filter(
        (n) => n.category === 'compliance' && n.status !== 'read'
      ).length;
      if (complianceAlerts > 0) {
        result.push({
          id: 'compliance',
          title: `${complianceAlerts} compliance alert${complianceAlerts !== 1 ? 's' : ''}`,
          description: 'Expiring insurance, licenses, or documents',
          icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
          href: '/notifications?category=compliance',
          priority: 'high',
        });
      }
    }

    // Stale leads for sales reps
    if (role === 'sales_rep' && user?.uid) {
      const staleLeads = leads.filter((l) => {
        if (l.assignedTo !== user.uid || l.status === 'converted' || l.status === 'lost') return false;
        const lastActivity = l.contactedAt || l.createdAt;
        if (!lastActivity) return false;
        const actDate = lastActivity instanceof Date ? lastActivity : lastActivity?.toDate?.();
        if (!actDate) return false;
        const hoursSince = (now.getTime() - actDate.getTime()) / (1000 * 60 * 60);
        return hoursSince > 48;
      }).length;
      if (staleLeads > 0) {
        result.push({
          id: 'stale-leads',
          title: `${staleLeads} lead${staleLeads !== 1 ? 's' : ''} need follow-up`,
          description: 'No contact in 48+ hours',
          icon: <Clock className="w-4 h-4 text-amber-400" />,
          href: '/kd?assigned=me',
          priority: 'high',
        });
      }
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2 };
    result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return result;
  }, [leads, invoices, lowStockCount, notifications, isAdmin, role, user?.uid]);

  if (leadsLoading || invoicesLoading) return null;
  if (items.length === 0) {
    return (
      <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 text-center">
        <p className="text-green-400 text-sm font-medium">All caught up — nothing needs your attention right now.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">Needs Attention</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center gap-3 p-3 bg-brand-charcoal rounded-xl border border-gray-800 hover:border-brand-gold/40 transition-colors"
          >
            <div className="p-2 bg-gray-800 rounded-lg shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{item.title}</p>
              <p className="text-xs text-gray-400 truncate">{item.description}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
