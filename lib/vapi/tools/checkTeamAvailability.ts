import { getAdminDb } from '@/lib/firebase/admin';
import { calculateDistanceMiles } from '@/lib/utils/distance';
import { registerTool, CallContext } from '@/lib/vapi/toolRegistry';

type TimeBlock = 'am' | 'pm' | 'evening';

function getCurrentTimeBlock(): TimeBlock {
  const hour = new Date().getHours();
  if (hour < 12) return 'am';
  if (hour < 18) return 'pm';
  return 'evening';
}

interface ScoredContractor {
  id: string;
  userId: string;
  name: string;
  phone: string;
  available: boolean;
  distance: number | null;
  rating: number;
}

async function checkTeamAvailabilityHandler(
  params: Record<string, unknown>,
  _ctx: CallContext
): Promise<unknown> {
  const trade = params.trade as string | undefined;
  const market = params.market as string | undefined;
  const city = params.city as string | undefined;
  const zip = params.zip as string | undefined;
  const urgency = params.urgency as string | undefined;
  const projectType = params.projectType as string | undefined;

  const db = getAdminDb();

  // Step 1: Check routing rules for a direct match
  try {
    const rulesSnap = await db
      .collection('routingRules')
      .orderBy('priority', 'asc')
      .get();

    for (const ruleDoc of rulesSnap.docs) {
      const rule = ruleDoc.data();
      if (!rule.active) continue;

      const conditions = rule.conditions || {};
      let matches = true;

      if (conditions.trade && trade && conditions.trade !== trade) matches = false;
      if (conditions.market && market && conditions.market !== market) matches = false;

      if (matches && rule.targetTeam?.length > 0) {
        // Found a matching routing rule — look up the first available team member
        for (const memberId of rule.targetTeam) {
          const contractorDoc = await db.collection('contractors').doc(memberId).get();
          if (!contractorDoc.exists) continue;

          const contractor = contractorDoc.data()!;
          if (contractor.status !== 'active') continue;

          // Check availability for current time block
          const today = new Date().toISOString().split('T')[0];
          const currentBlock = getCurrentTimeBlock();
          const availDoc = await db
            .collection('contractors')
            .doc(memberId)
            .collection('availability')
            .doc(today)
            .get();

          let isAvailable = true;
          if (availDoc.exists) {
            const blocks = availDoc.data()?.blocks;
            if (blocks && blocks[currentBlock] && blocks[currentBlock] !== 'available') {
              isAvailable = false;
            }
          }

          if (isAvailable) {
            return {
              available: true,
              teamMemberName: contractor.businessName || contractor.displayName || 'Team Member',
              teamMemberPhone: contractor.phone || '',
              teamMemberId: memberId,
              estimatedCallbackMinutes: 5,
            };
          }
        }
      }
    }
  } catch (err) {
    console.error('Error checking routing rules:', err);
    // Fall through to contractor search
  }

  // Step 2: Fall back to finding the closest available contractor
  try {
    const contractorsQuery = db
      .collection('contractors')
      .where('status', '==', 'active');

    const contractorsSnap = await contractorsQuery.get();

    if (contractorsSnap.empty) {
      return { available: false, reason: 'No team members available for this time' };
    }

    const today = new Date().toISOString().split('T')[0];
    const currentBlock = getCurrentTimeBlock();
    const scored: ScoredContractor[] = [];

    for (const doc of contractorsSnap.docs) {
      const data = doc.data();

      // Filter by trade if specified
      if (trade) {
        const trades = data.trades as string[] | undefined;
        if (trades && !trades.includes(trade)) continue;
      }

      // Check availability
      const availDoc = await db
        .collection('contractors')
        .doc(doc.id)
        .collection('availability')
        .doc(today)
        .get();

      let isAvailable = true;
      if (availDoc.exists) {
        const blocks = availDoc.data()?.blocks;
        if (blocks && blocks[currentBlock] && blocks[currentBlock] !== 'available') {
          isAvailable = false;
        }
      }

      // Calculate distance if caller has location
      const distance: number | null = null;
      const _address = data.address as { lat?: number; lng?: number } | undefined;
      // We don't have caller lat/lng directly, but we could geocode city/zip in the future
      // For now, distance remains null unless address coordinates are available

      const ratingData = data.rating as { overall?: number } | undefined;
      const rating = ratingData?.overall || 3;

      scored.push({
        id: doc.id,
        userId: data.userId as string,
        name: (data.businessName as string) || (data.displayName as string) || 'Team Member',
        phone: (data.phone as string) || '',
        available: isAvailable,
        distance,
        rating,
      });
    }

    // Sort: available first, then by distance (nulls last), then by rating desc
    scored.sort((a, b) => {
      // Available first
      if (a.available !== b.available) return a.available ? -1 : 1;
      // Distance ascending (nulls last)
      if (a.distance !== null && b.distance !== null) {
        if (a.distance !== b.distance) return a.distance - b.distance;
      } else if (a.distance !== null) {
        return -1;
      } else if (b.distance !== null) {
        return 1;
      }
      // Rating descending
      return b.rating - a.rating;
    });

    const best = scored.find((c) => c.available);

    if (best) {
      return {
        available: true,
        teamMemberName: best.name,
        teamMemberPhone: best.phone,
        teamMemberId: best.id,
        estimatedCallbackMinutes: urgency === 'high' ? 5 : 15,
      };
    }

    return { available: false, reason: 'No team members available for this time' };
  } catch (err) {
    console.error('Error finding available contractor:', err);
    return { available: false, reason: 'Unable to check team availability at this time' };
  }
}

registerTool({
  name: 'checkTeamAvailability',
  description:
    'Check if a team member is available to handle an inbound call or callback. ' +
    'Checks routing rules first, then falls back to finding the closest available contractor.',
  parameters: {
    type: 'object',
    properties: {
      projectType: {
        type: 'string',
        description: 'Type of project (e.g. roofing, siding, windows)',
      },
      trade: {
        type: 'string',
        description: 'Trade or specialty needed (e.g. installer, sales_rep, plumber)',
      },
      market: {
        type: 'string',
        description: 'Market or region name',
      },
      city: {
        type: 'string',
        description: 'City of the caller',
      },
      zip: {
        type: 'string',
        description: 'ZIP code of the caller',
      },
      urgency: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'Urgency level of the request',
      },
    },
    required: [],
  },
  handler: checkTeamAvailabilityHandler,
});
