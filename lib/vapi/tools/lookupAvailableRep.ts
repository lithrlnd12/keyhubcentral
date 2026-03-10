import { getAdminDb } from '@/lib/firebase/admin';
import { calculateDistanceMiles } from '@/lib/utils/distance';
import { registerTool, ToolDefinition, CallContext } from '@/lib/vapi/toolRegistry';

const DEFAULT_SERVICE_RADIUS_MILES = 50;

const WEIGHTS = {
  distance: 0.5,
  rating: 0.5,
};

interface ScoredRep {
  contractorId: string;
  userId: string;
  name: string;
  score: number;
  distance: number | null;
}

const lookupAvailableRep: ToolDefinition = {
  name: 'lookupAvailableRep',
  description:
    'Find the best available sales rep to handle a warm transfer. ' +
    'Scores reps by proximity and rating, then checks same-day availability.',
  parameters: {
    city: { type: 'string', description: 'City of the caller or project location' },
    zip: { type: 'string', description: 'ZIP code of the caller or project location' },
    projectType: {
      type: 'string',
      description: 'Type of project (e.g. roofing, siding, windows)',
    },
    lat: { type: 'number', description: 'Latitude of caller location' },
    lng: { type: 'number', description: 'Longitude of caller location' },
  },

  async handler(
    params: Record<string, unknown>,
    _ctx: CallContext
  ): Promise<unknown> {
    const db = getAdminDb();

    const lat = params.lat as number | undefined;
    const lng = params.lng as number | undefined;
    const projectType = params.projectType as string;

    // Query active contractors with sales_rep trade
    const contractorsSnap = await db
      .collection('contractors')
      .where('status', '==', 'active')
      .get();

    const salesReps = contractorsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown> & { id: string }))
      .filter((c) => {
        const trades = c.trades as string[] | undefined;
        return trades && trades.includes('sales_rep');
      });

    if (salesReps.length === 0) {
      return { found: false, reason: 'No active sales reps available' };
    }

    // Score each rep: 50% distance + 50% rating
    const scored: ScoredRep[] = [];

    for (const rep of salesReps) {
      const repAddress = rep.address as { lat?: number; lng?: number } | undefined;
      const repRating = rep.rating as { overall?: number } | undefined;
      const serviceRadius = (rep.serviceRadius as number) || DEFAULT_SERVICE_RADIUS_MILES;
      const rating = repRating?.overall || 3;

      let distance: number | null = null;
      let distanceScore = 50; // default mid-score when distance can't be calculated

      if (lat && lng && repAddress?.lat && repAddress?.lng) {
        distance = calculateDistanceMiles(repAddress.lat, repAddress.lng, lat, lng);

        // Skip reps outside their service radius
        if (distance > serviceRadius) {
          continue;
        }

        // Distance score: closer = better (100 at 0 mi, 0 at 2x service radius)
        distanceScore = Math.max(0, 100 - (distance / (serviceRadius * 2)) * 100);
      }

      // Rating score: 1-5 mapped to 0-100
      const ratingScore = Math.min(100, Math.max(0, rating * 20));

      const combinedScore =
        distanceScore * WEIGHTS.distance + ratingScore * WEIGHTS.rating;

      scored.push({
        contractorId: rep.id,
        userId: rep.userId as string,
        name: (rep.businessName as string) || (rep.displayName as string) || 'Unknown',
        score: Math.round(combinedScore),
        distance,
      });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return { found: false, reason: 'No sales reps found within service radius' };
    }

    // Check same-day availability starting from the top-scored rep
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    for (const rep of scored) {
      const availSnap = await db
        .collection('contractors')
        .doc(rep.contractorId)
        .collection('availability')
        .doc(today)
        .get();

      if (!availSnap.exists) {
        // No availability doc means default available
        return {
          found: true,
          repName: rep.name,
          repUserId: rep.userId,
          repContractorId: rep.contractorId,
        };
      }

      const availData = availSnap.data();
      const blocks = availData?.blocks as
        | { am?: string; pm?: string; evening?: string }
        | undefined;

      if (!blocks) {
        // No blocks defined — treat as available
        return {
          found: true,
          repName: rep.name,
          repUserId: rep.userId,
          repContractorId: rep.contractorId,
        };
      }

      // Determine current time block
      const hour = new Date().getHours();
      let currentBlock: 'am' | 'pm' | 'evening';
      if (hour < 12) {
        currentBlock = 'am';
      } else if (hour < 17) {
        currentBlock = 'pm';
      } else {
        currentBlock = 'evening';
      }

      const blockStatus = blocks[currentBlock];
      if (!blockStatus || blockStatus === 'available') {
        return {
          found: true,
          repName: rep.name,
          repUserId: rep.userId,
          repContractorId: rep.contractorId,
        };
      }

      // This rep is busy/unavailable/on_leave for the current block — try next
    }

    return { found: false, reason: 'All matching sales reps are unavailable right now' };
  },
};

registerTool(lookupAvailableRep);

export default lookupAvailableRep;
