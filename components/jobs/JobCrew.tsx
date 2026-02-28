'use client';

import { useState, useEffect } from 'react';
import { Job } from '@/types/job';
import { Contractor } from '@/types/contractor';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getContractor, getContractorByUserId } from '@/lib/firebase/contractors';
import { getUserProfile } from '@/lib/firebase/auth';
import { UserProfile } from '@/types/user';
import { Users, UserPlus, X, User, MapPin, Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import Link from 'next/link';

interface JobCrewProps {
  job: Job;
  canEdit: boolean;
  onUpdate: (data: Partial<Job>) => Promise<void>;
}

interface CrewMember {
  id: string;
  contractor: Contractor | null;
  userProfile: UserProfile | null;
  role: 'crew' | 'pm' | 'sales';
  loading: boolean;
}

export function JobCrew({ job, canEdit, onUpdate }: JobCrewProps) {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Load contractor details for all crew members
  useEffect(() => {
    const loadCrew = async () => {
      const crewMembers: CrewMember[] = [];

      // Add PM if assigned
      if (job.pmId) {
        crewMembers.push({ id: job.pmId, contractor: null, userProfile: null, role: 'pm', loading: true });
      }

      // Add sales rep if assigned
      if (job.salesRepId) {
        crewMembers.push({ id: job.salesRepId, contractor: null, userProfile: null, role: 'sales', loading: true });
      }

      // Add crew members
      job.crewIds.forEach((id) => {
        if (id !== job.pmId && id !== job.salesRepId) {
          crewMembers.push({ id, contractor: null, userProfile: null, role: 'crew', loading: true });
        }
      });

      setCrew(crewMembers);

      // Load contractor details (try by doc ID first, then by userId, then user profile)
      const loaded = await Promise.all(
        crewMembers.map(async (member) => {
          try {
            let contractor = await getContractor(member.id);
            if (!contractor) {
              contractor = await getContractorByUserId(member.id);
            }
            if (contractor) {
              return { ...member, contractor, loading: false };
            }
            // Fall back to user profile (e.g. salesRepId / pmId store user UIDs)
            const userProfile = await getUserProfile(member.id);
            return { ...member, userProfile, loading: false };
          } catch {
            return { ...member, loading: false };
          }
        })
      );

      setCrew(loaded);
      setLoading(false);
    };

    loadCrew();
  }, [job.pmId, job.salesRepId, job.crewIds]);

  const handleRemove = async (memberId: string, role: 'crew' | 'pm' | 'sales') => {
    try {
      if (role === 'pm') {
        await onUpdate({ pmId: null });
      } else if (role === 'sales') {
        await onUpdate({ salesRepId: null });
      } else {
        await onUpdate({ crewIds: job.crewIds.filter((id) => id !== memberId) });
      }
    } catch (error) {
      console.error('Failed to remove crew member:', error);
    }
  };

  const getRoleLabel = (role: 'crew' | 'pm' | 'sales') => {
    switch (role) {
      case 'pm':
        return 'Project Manager';
      case 'sales':
        return 'Sales Rep';
      default:
        return 'Crew';
    }
  };

  const getRoleColor = (role: 'crew' | 'pm' | 'sales') => {
    switch (role) {
      case 'pm':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'sales':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-gold" />
          Assigned Crew ({crew.length})
        </CardTitle>
        {canEdit && (
          <Link href={`/kr/${job.id}/edit?tab=crew`}>
            <Button variant="outline" size="sm">
              <UserPlus className="w-4 h-4 mr-1" />
              Manage Crew
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-brand-gold animate-spin" />
          </div>
        ) : crew.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">No crew assigned yet</p>
            {canEdit && (
              <Link href={`/kr/${job.id}/edit?tab=crew`}>
                <Button variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign Crew
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {crew.map((member) => (
              <div
                key={member.id}
                className="bg-gray-800/50 rounded-lg border border-gray-700 p-4"
              >
                {member.loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                  </div>
                ) : member.contractor ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          href={`/kts/${member.contractor.id}`}
                          className="text-white font-medium hover:text-brand-gold"
                        >
                          {member.contractor.businessName}
                        </Link>
                        <span
                          className={cn(
                            'inline-flex ml-2 px-2 py-0.5 text-xs rounded-full border',
                            getRoleColor(member.role)
                          )}
                        >
                          {getRoleLabel(member.role)}
                        </span>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => handleRemove(member.id, member.role)}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {member.contractor.address.city}, {member.contractor.address.state}
                        </span>
                      </div>
                      {member.contractor.rating?.overall && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Star className="w-3.5 h-3.5 text-brand-gold" />
                          <span>
                            {member.contractor.rating.overall.toFixed(1)} rating
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : member.userProfile ? (
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {member.userProfile.displayName || member.userProfile.email}
                        </p>
                        <span
                          className={cn(
                            'inline-flex px-2 py-0.5 text-xs rounded-full border',
                            getRoleColor(member.role)
                          )}
                        >
                          {getRoleLabel(member.role)}
                        </span>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleRemove(member.id, member.role)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Unknown</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
