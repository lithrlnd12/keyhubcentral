'use client';

import { useEffect, useState } from 'react';
import { Star, Wrench, User } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Contractor } from '@/types/contractor';
import { cn } from '@/lib/utils';

interface InstallerCardProps {
  contractorId: string;
  className?: string;
}

export function InstallerCard({ contractorId, className }: InstallerCardProps) {
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContractor() {
      try {
        const docRef = doc(db, 'contractors', contractorId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setContractor({ id: docSnap.id, ...docSnap.data() } as Contractor);
        }
      } catch (err) {
        console.error('Error fetching contractor:', err);
      } finally {
        setLoading(false);
      }
    }

    if (contractorId) {
      fetchContractor();
    } else {
      setLoading(false);
    }
  }, [contractorId]);

  if (loading) {
    return (
      <div className={cn('bg-gray-50 rounded-xl p-4 animate-pulse', className)}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!contractor) {
    return null;
  }

  const overallRating = contractor.rating?.overall ?? 0;
  const fullStars = Math.floor(overallRating);
  const hasHalfStar = overallRating - fullStars >= 0.5;

  return (
    <div
      className={cn(
        'bg-gray-50 border border-gray-200 rounded-xl p-4',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Name */}
          <h4 className="text-sm font-semibold text-gray-900 truncate">
            {contractor.businessName || 'Assigned Installer'}
          </h4>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-3.5 h-3.5',
                  i < fullStars
                    ? 'fill-amber-400 text-amber-400'
                    : i === fullStars && hasHalfStar
                      ? 'fill-amber-400/50 text-amber-400'
                      : 'fill-gray-200 text-gray-200'
                )}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1">
              {overallRating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Specialties */}
      {contractor.specialties && contractor.specialties.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {contractor.specialties.slice(0, 4).map((specialty) => (
            <span
              key={specialty}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
            >
              <Wrench className="w-3 h-3" />
              {specialty}
            </span>
          ))}
          {contractor.specialties.length > 4 && (
            <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
              +{contractor.specialties.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
