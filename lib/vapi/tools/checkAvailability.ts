import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, CallContext } from '@/lib/vapi/toolRegistry';

type TimeBlock = 'am' | 'pm' | 'evening';
type BlockStatus = 'available' | 'busy' | 'unavailable' | 'on_leave';

const TIME_BLOCK_CONFIG: Record<TimeBlock, { start: number; end: number; label: string }> = {
  am: { start: 6, end: 12, label: 'Morning (6AM-12PM)' },
  pm: { start: 12, end: 18, label: 'Afternoon (12PM-6PM)' },
  evening: { start: 18, end: 22, label: 'Evening (6PM-10PM)' },
};

const BLOCKS: TimeBlock[] = ['am', 'pm', 'evening'];

function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

async function checkAvailabilityHandler(
  params: Record<string, unknown>,
  ctx: CallContext
): Promise<unknown> {
  const userId = params.userId as string;
  const startDate = params.startDate as string;
  const daysToCheck = (params.daysToCheck as number) || 7;

  if (!userId || !startDate) {
    throw new Error('userId and startDate are required');
  }

  const db = getAdminDb();

  // Look up contractor ID from users collection
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new Error(`User ${userId} not found`);
  }

  // Resolve the actual contractor document ID — user docs don't store contractorId,
  // the contractor doc stores userId instead.
  let contractorId: string = userId; // fallback
  const contractorQuery = await db
    .collection('contractors')
    .where('userId', '==', userId)
    .limit(1)
    .get();
  if (!contractorQuery.empty) {
    contractorId = contractorQuery.docs[0].id;
  }

  // Query availability for each day
  const availableSlots: Array<{
    date: string;
    dayOfWeek: string;
    slots: Array<{ block: TimeBlock; label: string; available: boolean }>;
  }> = [];

  for (let i = 0; i < daysToCheck; i++) {
    const currentDate = addDays(startDate, i);
    const dayOfWeek = getDayOfWeek(currentDate);

    const availDoc = await db
      .collection('contractors')
      .doc(contractorId)
      .collection('availability')
      .doc(currentDate)
      .get();

    const blocks = availDoc.exists ? availDoc.data()?.blocks : null;

    // Also check for existing appointments on this date
    const appointmentsSnap = await db
      .collection('contractors')
      .doc(contractorId)
      .collection('appointments')
      .where('date', '==', currentDate)
      .where('status', '==', 'scheduled')
      .get();

    const existingAppointments = appointmentsSnap.docs.map((d) => {
      const data = d.data();
      return { timeBlock: data.timeBlock, customerName: data.customerName };
    });

    const slots = BLOCKS.map((block) => {
      const status: BlockStatus = blocks?.[block] || 'available';
      const appt = existingAppointments.find((a) => a.timeBlock === block);
      return {
        block,
        label: TIME_BLOCK_CONFIG[block].label,
        available: status === 'available',
        ...(appt ? { existingAppointment: appt.customerName } : {}),
      };
    });

    availableSlots.push({
      date: currentDate,
      dayOfWeek,
      slots,
    });
  }

  return { availableSlots };
}

registerTool({
  name: 'checkAvailability',
  description:
    'Check a contractor or sales rep availability for scheduling appointments over a range of days.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The contractor or rep userId to check availability for',
      },
      startDate: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format',
      },
      daysToCheck: {
        type: 'number',
        description: 'Number of days to check from startDate (default 7)',
      },
    },
    required: ['userId', 'startDate'],
  },
  handler: checkAvailabilityHandler,
});
