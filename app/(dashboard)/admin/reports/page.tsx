'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks';
import { redirect } from 'next/navigation';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { SavedReportsList } from '@/components/reports/SavedReportsList';
import { ReportConfig, ReportResult } from '@/types/report';
import {
  executeReport,
  exportToCSV,
} from '@/lib/utils/reportEngine';
import { getJobs } from '@/lib/firebase/jobs';
import { getLeads } from '@/lib/firebase/leads';
import { getInvoices } from '@/lib/firebase/invoices';
import { BarChart3, BookmarkCheck } from 'lucide-react';

type Tab = 'build' | 'saved';

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('build');
  const [editingConfig, setEditingConfig] = useState<ReportConfig | null>(null);

  // Protect route — owner/admin only
  if (user?.role && !['owner', 'admin'].includes(user.role)) {
    redirect('/unauthorized');
  }

  const handleRunSavedReport = useCallback((config: ReportConfig) => {
    setEditingConfig(config);
    setActiveTab('build');
  }, []);

  const handleEditReport = useCallback((config: ReportConfig) => {
    setEditingConfig(config);
    setActiveTab('build');
  }, []);

  const handleExportCSVFromSaved = useCallback(async (config: ReportConfig) => {
    try {
      // Fetch all data
      const [jobs, leads, invoices] = await Promise.all([
        getJobs(),
        getLeads(),
        getInvoices(),
      ]);

      const { getDocs, collection, query, orderBy } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/config');

      const [campaignsSnap, contractorsSnap] = await Promise.all([
        getDocs(query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'contractors'), orderBy('createdAt', 'desc'))),
      ]);

      const campaigns = campaignsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
      const contractors = contractorsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

      const result = executeReport(config, { jobs, leads, campaigns, invoices, contractors });
      const csv = exportToCSV(result, config);

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.name || 'report'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export CSV. Please try again.');
    }
  }, []);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'build', label: 'Build Report', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'saved', label: 'Saved Reports', icon: <BookmarkCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Report Builder</h2>
        <p className="text-gray-400 mt-1">
          Build custom reports across jobs, leads, campaigns, invoices, and contractors
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-brand-charcoal rounded-lg p-1 border border-gray-800 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === 'build' && activeTab !== 'build') {
                setEditingConfig(null);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-brand-gold text-brand-black'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'build' && (
        <ReportBuilder
          key={editingConfig?.id || 'new'}
          initialConfig={editingConfig}
        />
      )}

      {activeTab === 'saved' && (
        <div className="bg-brand-charcoal rounded-xl border border-gray-800">
          <SavedReportsList
            onRunReport={handleRunSavedReport}
            onEditReport={handleEditReport}
            onExportCSV={handleExportCSVFromSaved}
          />
        </div>
      )}
    </div>
  );
}
