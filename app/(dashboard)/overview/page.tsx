'use client';

import {
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  Target,
  Wrench,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

function StatCard({ title, value, change, changeType = 'neutral', icon }: StatCardProps) {
  const changeColors = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-gray-400',
  };

  return (
    <div className="bg-brand-charcoal rounded-xl p-4 md:p-6 border border-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        <div className="p-3 bg-brand-gold/10 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

function QuickAction({ title, description, icon, href }: QuickActionProps) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 p-4 bg-brand-charcoal rounded-xl border border-gray-800 hover:border-brand-gold/50 transition-colors"
    >
      <div className="p-3 bg-brand-gold/10 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </a>
  );
}

export default function OverviewPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white">
          Welcome back, {user?.displayName?.split(' ')[0] || 'User'}
        </h2>
        <p className="text-gray-400 mt-1">
          Here&apos;s what&apos;s happening across your businesses today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value="$127,430"
          change="+12.5% from last month"
          changeType="positive"
          icon={<DollarSign className="w-5 h-5 text-brand-gold" />}
        />
        <StatCard
          title="Active Jobs"
          value="24"
          change="3 starting this week"
          changeType="neutral"
          icon={<Briefcase className="w-5 h-5 text-brand-gold" />}
        />
        <StatCard
          title="Active Contractors"
          value="18"
          change="2 pending approval"
          changeType="neutral"
          icon={<Users className="w-5 h-5 text-brand-gold" />}
        />
        <StatCard
          title="Leads (MTD)"
          value="156"
          change="+8.3% from last month"
          changeType="positive"
          icon={<TrendingUp className="w-5 h-5 text-brand-gold" />}
        />
      </div>

      {/* Business Units Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-brand-gold/10 rounded-lg">
              <Wrench className="w-5 h-5 text-brand-gold" />
            </div>
            <h3 className="font-semibold text-white">Key Trade Solutions</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Active Contractors</span>
              <span className="text-white">18</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Jobs This Month</span>
              <span className="text-white">32</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Revenue</span>
              <span className="text-white">$45,200</span>
            </div>
          </div>
        </div>

        <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-brand-gold/10 rounded-lg">
              <Building2 className="w-5 h-5 text-brand-gold" />
            </div>
            <h3 className="font-semibold text-white">Key Renovations</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Active Jobs</span>
              <span className="text-white">24</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Completed (MTD)</span>
              <span className="text-white">8</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Revenue</span>
              <span className="text-white">$62,430</span>
            </div>
          </div>
        </div>

        <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-brand-gold/10 rounded-lg">
              <Target className="w-5 h-5 text-brand-gold" />
            </div>
            <h3 className="font-semibold text-white">Keynote Digital</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Leads Generated</span>
              <span className="text-white">156</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Active Campaigns</span>
              <span className="text-white">4</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Revenue</span>
              <span className="text-white">$19,800</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            title="New Lead"
            description="Add a new lead"
            icon={<Target className="w-5 h-5 text-brand-gold" />}
            href="/kd/leads/new"
          />
          <QuickAction
            title="Create Invoice"
            description="Generate invoice"
            icon={<DollarSign className="w-5 h-5 text-brand-gold" />}
            href="/financials/invoices/new"
          />
          <QuickAction
            title="Assign Crew"
            description="Schedule contractors"
            icon={<Users className="w-5 h-5 text-brand-gold" />}
            href="/kts/schedule"
          />
          <QuickAction
            title="View Jobs"
            description="Job pipeline"
            icon={<Briefcase className="w-5 h-5 text-brand-gold" />}
            href="/kr/jobs"
          />
        </div>
      </div>
    </div>
  );
}
