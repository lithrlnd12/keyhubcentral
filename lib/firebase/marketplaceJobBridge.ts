/**
 * Bridge between Marketplace and Jobs systems.
 * When a bid is accepted, auto-creates a job assigned to the winning contractor.
 */

import { Timestamp } from 'firebase/firestore';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { MarketplaceListing, MarketplaceBid } from '@/types/marketplace';
import { Job, JobType, JobStatus } from '@/types/job';
import { createJob, generateJobNumber } from './jobs';
import { acceptBid } from './marketplace';
import { createNotification } from './notifications';
import { findOrCreateNetworkJobChat } from './messages';

interface AcceptBidResult {
  jobId: string;
  jobNumber: string;
}

/**
 * Accept a marketplace bid and auto-create a job for the winning contractor.
 *
 * 1. Accepts the bid (auto-rejects others, listing → claimed)
 * 2. Creates a job at 'scheduled' status with the contractor assigned
 * 3. Updates listing → 'filled' with jobId link
 * 4. Sends bid_accepted notification to contractor
 * 5. Creates network job chat for cross-network listings
 */
export async function acceptBidAndCreateJob(
  listing: MarketplaceListing,
  bidId: string,
  acceptedByUserId: string
): Promise<AcceptBidResult> {
  // 1. Find the bid
  const bid = listing.bids.find((b) => b.id === bidId);
  if (!bid) throw new Error('Bid not found');

  // 2. Accept the bid (sets bid.status=accepted, auto-rejects others, listing→claimed)
  await acceptBid(listing.id, bidId);

  // 3. Generate job number and create the job
  const jobNumber = await generateJobNumber();

  const scheduledStart = listing.dateNeeded
    ? Timestamp.fromDate(new Date(listing.dateNeeded))
    : null;

  const jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'> = {
    jobNumber,
    customer: {
      name: listing.dealerName,
      phone: '',
      email: '',
      address: {
        street: '',
        city: listing.location.city,
        state: listing.location.state,
        zip: listing.location.zip,
        lat: listing.location.lat ?? null,
        lng: listing.location.lng ?? null,
      },
    },
    type: 'other' as JobType,
    status: 'scheduled' as JobStatus,
    salesRepId: null,
    crewIds: [bid.contractorId],
    pmId: null,
    marketplaceListingId: listing.id,
    costs: {
      materialProjected: 0,
      materialActual: 0,
      laborProjected: bid.proposedRate,
      laborActual: 0,
    },
    dates: {
      created: Timestamp.now(),
      sold: null,
      scheduledStart,
      actualStart: null,
      targetCompletion: null,
      actualCompletion: null,
      paidInFull: null,
    },
    warranty: {
      startDate: null,
      endDate: null,
      status: 'pending',
    },
    notes: [
      `[Marketplace] ${listing.title}`,
      listing.description,
      '',
      `Trade: ${listing.trade}`,
      `Job Type: ${listing.jobType}`,
      `Time Block: ${listing.timeBlock}`,
      `Estimated Duration: ${listing.estimatedDuration}`,
      `Crew Size: ${listing.crewSize}`,
      `Pay Type: ${listing.payType}`,
      `Contractor: ${bid.contractorName}`,
    ].join('\n'),
  };

  const jobId = await createJob(jobData);

  // 4. Update listing with jobId and advance to 'filled'
  const listingRef = doc(db, 'marketplaceListings', listing.id);
  await updateDoc(listingRef, {
    jobId,
    status: 'filled',
    updatedAt: serverTimestamp(),
  });

  // 5. Notify the contractor
  const address = `${listing.location.city}, ${listing.location.state}`;
  try {
    await createNotification(bid.contractorId, 'bid_accepted', {
      listingTitle: listing.title,
      jobNumber,
      address,
      date: listing.dateNeeded || 'TBD',
      jobId,
    });
  } catch (err) {
    console.error('Failed to send bid_accepted notification:', err);
  }

  // 6. Create cross-network job chat for network listings
  if (listing.networkId) {
    try {
      await findOrCreateNetworkJobChat(
        jobId,
        [acceptedByUserId, bid.contractorId],
        {
          [acceptedByUserId]: listing.dealerName,
          [bid.contractorId]: bid.contractorName,
        },
        acceptedByUserId
      );
    } catch (err) {
      console.error('Failed to create network job chat:', err);
    }
  }

  return { jobId, jobNumber };
}
