'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Briefcase, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/hooks';
import { getContractorByUserId } from '@/lib/firebase/contractors';
import { Contractor } from '@/types/contractor';

export default function PortalDashboardPage() {
  const { user } = useAuth();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back{contractor?.businessName ? `, ${contractor.businessName}` : ''}!
        </h1>
        <p className="text-gray-400 mt-1">
          Manage your availability and view your assignments
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Availability Card */}
        <Link href="/portal/availability">
          <Card className="p-6 hover:border-gold/50 transition-colors cursor-pointer h-full">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-gold/10 rounded-lg">
                <Calendar className="h-6 w-6 text-gold" />
              </div>
              <ArrowRight className="h-5 w-5 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mt-4">My Availability</h3>
            <p className="text-gray-400 text-sm mt-1">
              Set your available days and time off
            </p>
          </Card>
        </Link>

        {/* Quick Status Card */}
        <Card className="p-6">
          <div className="p-3 bg-blue-500/10 rounded-lg w-fit">
            <Clock className="h-6 w-6 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mt-4">Status</h3>
          <p className="text-gray-400 text-sm mt-1">
            {contractor?.status === 'active' ? (
              <span className="text-green-400">Active</span>
            ) : (
              <span className="text-yellow-400">{contractor?.status || 'Unknown'}</span>
            )}
          </p>
        </Card>

        {/* Trades Card */}
        <Card className="p-6">
          <div className="p-3 bg-purple-500/10 rounded-lg w-fit">
            <Briefcase className="h-6 w-6 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mt-4">Trades</h3>
          <div className="flex flex-wrap gap-1 mt-2">
            {contractor?.trades?.map((trade) => (
              <span
                key={trade}
                className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded"
              >
                {trade}
              </span>
            )) || (
              <span className="text-gray-500 text-sm">No trades assigned</span>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
