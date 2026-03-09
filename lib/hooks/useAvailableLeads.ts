'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lead } from '@/types/lead';
import { subscribeToAvailableLeads, acceptLead } from '@/lib/firebase/leads';
import { findAndLinkContractor } from '@/lib/firebase/contractors';
import { Contractor } from '@/types/contractor';
import { calculateDistanceMiles } from '@/lib/utils/distance';
import { useAuth } from './useAuth';

interface AvailableLeadWithDistance extends Lead {
  distance: number | null;
}

export function useAvailableLeads() {
  const { user } = useAuth();
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load contractor data
  useEffect(() => {
    async function loadContractor() {
      if (!user?.uid || !user?.email) return;
      try {
        const data = await findAndLinkContractor(user.uid, user.email);
        setContractor(data);
      } catch (err) {
        console.error('Error loading contractor:', err);
      }
    }
    loadContractor();
  }, [user?.uid, user?.email]);

  // Subscribe to available leads
  useEffect(() => {
    const unsub = subscribeToAvailableLeads((leads) => {
      setAllLeads(leads);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Filter leads by contractor's specialties and distance
  const leads: AvailableLeadWithDistance[] = allLeads
    .map((lead) => {
      let distance: number | null = null;
      if (
        contractor?.address?.lat && contractor?.address?.lng &&
        lead.customer?.address?.lat && lead.customer?.address?.lng
      ) {
        distance = calculateDistanceMiles(
          contractor.address.lat,
          contractor.address.lng,
          lead.customer.address.lat,
          lead.customer.address.lng
        );
      }
      return { ...lead, distance };
    })
    .filter((lead) => {
      // Filter by distance
      if (lead.distance !== null && contractor) {
        if (lead.distance > (contractor.serviceRadius || 50)) return false;
      }

      // Filter by specialty overlap
      if (lead.specialties && lead.specialties.length > 0 && contractor?.specialties?.length) {
        const hasOverlap = lead.specialties.some((s) => contractor.specialties.includes(s));
        if (!hasOverlap) return false;
      }

      return true;
    })
    .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

  const handleAcceptLead = useCallback(async (leadId: string) => {
    if (!user?.uid || !contractor) return;
    setAccepting(leadId);
    setError(null);

    try {
      await acceptLead(
        leadId,
        user.uid,
        contractor.address,
        contractor.serviceRadius || 50,
        contractor.specialties || []
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept job';
      setError(message);
      throw err;
    } finally {
      setAccepting(null);
    }
  }, [user?.uid, contractor]);

  return {
    leads,
    loading,
    accepting,
    error,
    clearError: () => setError(null),
    acceptLead: handleAcceptLead,
    contractor,
  };
}
