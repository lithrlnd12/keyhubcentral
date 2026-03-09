'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, ClipboardList, MessageSquare, Star, ArrowRight, MapPin } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Lead } from '@/types/lead';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/hooks';

export default function CustomerDashboardPage() {
  const { user } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);

  useEffect(() => {
    async function loadLeads() {
      if (!user?.uid) return;
      try {
        const q = query(
          collection(db, 'leads'),
          where('customerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lead)));
      } catch (err) {
        console.error('Error loading customer leads:', err);
      } finally {
        setLeadsLoading(false);
      }
    }
    loadLeads();
  }, [user?.uid]);

  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const activeCount = leads.filter((l) => ['new', 'assigned', 'contacted'].includes(l.status)).length;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome, {firstName}!
        </h1>
        <p className="text-gray-400 mt-1">
          Manage your home projects and book services
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/customer/find">
          <Card className="p-5 hover:border-brand-gold/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <MapPin className="h-6 w-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">Find Pros</h3>
                <p className="text-gray-400 text-sm mt-0.5">Browse contractors near you</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-600" />
            </div>
          </Card>
        </Link>

        <Link href="/customer/book">
          <Card className="p-5 hover:border-brand-gold/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-gold/10 rounded-xl">
                <ClipboardList className="h-6 w-6 text-brand-gold" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">Book a Pro</h3>
                <p className="text-gray-400 text-sm mt-0.5">Get a quote for your project</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-600" />
            </div>
          </Card>
        </Link>

        <Link href="/customer/projects">
          <Card className="p-5 hover:border-brand-gold/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Briefcase className="h-6 w-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">My Projects</h3>
                <p className="text-gray-400 text-sm mt-0.5">Track active and past work</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-600" />
            </div>
          </Card>
        </Link>

        <Link href="/messages">
          <Card className="p-5 hover:border-brand-gold/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <MessageSquare className="h-6 w-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">Messages</h3>
                <p className="text-gray-400 text-sm mt-0.5">Chat with your contractor</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-600" />
            </div>
          </Card>
        </Link>

        <Card className="p-5 opacity-60">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl">
              <Star className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold">Reviews</h3>
              <p className="text-gray-400 text-sm mt-0.5">Rate completed projects</p>
            </div>
            <span className="text-xs text-gray-600 font-medium">Coming soon</span>
          </div>
        </Card>
      </div>

      {/* Service Address */}
      {user?.serviceAddress && (
        <Card className="p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Service Address</h3>
          <p className="text-white">
            {user.serviceAddress.street}<br />
            {user.serviceAddress.city}, {user.serviceAddress.state} {user.serviceAddress.zip}
          </p>
        </Card>
      )}

      {/* Projects Summary or Empty State */}
      {!leadsLoading && activeCount > 0 ? (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">Active Projects</h3>
              <p className="text-gray-400 text-sm mt-0.5">{activeCount} project{activeCount !== 1 ? 's' : ''} in progress</p>
            </div>
            <Link href="/customer/projects">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </Card>
      ) : !leadsLoading ? (
        <Card className="p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-brand-gold" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
          <p className="text-gray-400 text-sm mb-4 max-w-sm mx-auto">
            Ready to get started? Book a pro and we&apos;ll match you with a vetted, top-rated contractor in your area.
          </p>
          <Link href="/customer/book">
            <Button>Book Your First Project</Button>
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
