'use client';

import { useEffect, useState } from 'react';
import {
  Calendar,
  Briefcase,
  DollarSign,
  Package,
  User,
  Settings,
  CheckCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ExpandableCard } from '@/components/ui/ExpandableCard';
import { useAuth } from '@/lib/hooks';
import { getContractorByUserId } from '@/lib/firebase/contractors';
import { Contractor } from '@/types/contractor';
import {
  AvailabilityCardContent,
  JobsCardContent,
  EarningsCardContent,
  InventoryCardContent,
  ProfileCardContent,
  SettingsCardContent,
} from '@/components/portal';
import { formatCurrency } from '@/lib/utils/formatters';

// Mock data for summaries - will be replaced with real data
const mockJobsSummary = { active: 3, total: 5 };
const mockEarningsSummary = { total: 7540, pending: 2850 };

export default function PortalDashboardPage() {
  const { user } = useAuth();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadContractor() {
      if (user?.uid) {
        try {
          const data = await getContractorByUserId(user.uid);
          setContractor(data);
        } catch (error) {
          console.error('Error loading contractor:', error);
        } finally {
          setLoading(false);
        }
      }
    }
    loadContractor();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          Welcome back{contractor?.businessName ? `, ${contractor.businessName}` : ''}!
        </h1>
        <p className="text-gray-400 mt-1">
          Manage your availability, jobs, and earnings
        </p>
      </div>

      {/* Expandable Cards */}
      <div className="space-y-3">
        {/* Availability Card */}
        <ExpandableCard
          id="availability"
          icon={<Calendar className="h-6 w-6 text-gold" />}
          iconBgColor="bg-gold/10"
          title="Availability"
          subtitle="Manage your schedule"
          expandedId={expandedId}
          onToggle={setExpandedId}
          summary={
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">Available today</span>
            </div>
          }
        >
          {contractor && <AvailabilityCardContent contractor={contractor} />}
        </ExpandableCard>

        {/* Jobs Card */}
        <ExpandableCard
          id="jobs"
          icon={<Briefcase className="h-6 w-6 text-blue-400" />}
          iconBgColor="bg-blue-500/10"
          title="My Jobs"
          subtitle="View assigned work"
          badge={
            <Badge variant="info">{mockJobsSummary.active} active</Badge>
          }
          expandedId={expandedId}
          onToggle={setExpandedId}
          summary={
            <p className="text-xs text-gray-400">
              {mockJobsSummary.total} jobs total
            </p>
          }
        >
          <JobsCardContent />
        </ExpandableCard>

        {/* Earnings Card */}
        <ExpandableCard
          id="earnings"
          icon={<DollarSign className="h-6 w-6 text-green-400" />}
          iconBgColor="bg-green-500/10"
          title="Earnings"
          subtitle="Payment history"
          expandedId={expandedId}
          onToggle={setExpandedId}
          summary={
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-400">{formatCurrency(mockEarningsSummary.total)} earned</span>
              <span className="text-yellow-400">{formatCurrency(mockEarningsSummary.pending)} pending</span>
            </div>
          }
        >
          <EarningsCardContent />
        </ExpandableCard>

        {/* Inventory Card */}
        <ExpandableCard
          id="inventory"
          icon={<Package className="h-6 w-6 text-purple-400" />}
          iconBgColor="bg-purple-500/10"
          title="Inventory"
          subtitle="Truck stock & receipts"
          expandedId={expandedId}
          onToggle={setExpandedId}
          summary={
            <p className="text-xs text-gray-400">
              Manage your truck inventory
            </p>
          }
        >
          <InventoryCardContent />
        </ExpandableCard>

        {/* Profile Card */}
        <ExpandableCard
          id="profile"
          icon={<User className="h-6 w-6 text-gray-400" />}
          iconBgColor="bg-gray-500/10"
          title="My Profile"
          subtitle={user?.displayName || user?.email || 'View details'}
          badge={
            contractor?.status === 'active' ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="warning">{contractor?.status || 'Unknown'}</Badge>
            )
          }
          expandedId={expandedId}
          onToggle={setExpandedId}
        >
          {user && <ProfileCardContent user={user as any} contractor={contractor} />}
        </ExpandableCard>

        {/* Settings Card */}
        <ExpandableCard
          id="settings"
          icon={<Settings className="h-6 w-6 text-gray-400" />}
          iconBgColor="bg-gray-500/10"
          title="Settings"
          subtitle="Integrations & preferences"
          expandedId={expandedId}
          onToggle={setExpandedId}
        >
          <SettingsCardContent />
        </ExpandableCard>
      </div>
    </div>
  );
}
