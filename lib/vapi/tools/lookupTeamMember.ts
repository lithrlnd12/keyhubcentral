import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, CallContext } from '@/lib/vapi/toolRegistry';

// Normalize phone to E.164 format (+1XXXXXXXXXX)
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  return `+${digits}`;
}

// Match names by checking if all search words appear in the name
// "Zach Rhyn" matches "Zachary Rhyne" because "zach" starts "zachary" and "rhyn" starts "rhyne"
function nameMatches(fullName: string, searchTerms: string[]): boolean {
  const nameLower = fullName.toLowerCase();
  const nameWords = nameLower.split(/\s+/);
  return searchTerms.every((term) =>
    nameWords.some((word) => word.startsWith(term) || word.includes(term))
  );
}

async function lookupTeamMemberHandler(
  params: Record<string, unknown>,
  _ctx: CallContext
): Promise<unknown> {
  const searchName = (params.name as string || '').toLowerCase().trim();

  if (!searchName) {
    return { found: false, error: 'Please provide a name to search for' };
  }

  const searchTerms = searchName.split(/\s+/).filter((w) => w.length > 0);

  const db = getAdminDb();
  const matches: Array<{
    name: string;
    phone: string | null;
    role: string;
    id: string;
    userId: string | null;
    source: string;
  }> = [];

  // 1. Search contractors
  const contractorsSnap = await db
    .collection('contractors')
    .where('status', '==', 'active')
    .get();

  for (const doc of contractorsSnap.docs) {
    const data = doc.data();
    const name = (data.businessName || data.contactName || data.displayName || '') as string;
    if (nameMatches(name, searchTerms)) {
      // Get phone from contractor record or linked user record
      let phone = (data.phone as string) || null;
      const userId = (data.userId as string) || null;

      if (!phone && userId) {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          phone = (userDoc.data()?.phone as string) || null;
        }
      }

      const trades = (data.trades as string[]) || [];
      matches.push({
        name,
        phone: normalizePhone(phone),
        role: trades.includes('sales_rep') ? 'sales_rep' : trades[0] || 'contractor',
        id: doc.id,
        userId,
        source: 'contractors',
      });
    }
  }

  // 2. Search users (sales reps, PMs, admins)
  const usersSnap = await db
    .collection('users')
    .where('status', '==', 'active')
    .get();

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const name = (data.displayName || '') as string;
    const role = (data.role as string) || '';

    if (nameMatches(name, searchTerms) && ['sales_rep', 'pm', 'admin', 'owner'].includes(role)) {
      // Skip if already found via contractor record
      const alreadyFound = matches.some((m) => m.userId === doc.id);
      if (!alreadyFound) {
        matches.push({
          name,
          phone: normalizePhone(data.phone as string),
          role,
          id: doc.id,
          userId: doc.id,
          source: 'users',
        });
      }
    }
  }

  // 3. Search partners
  const partnersSnap = await db
    .collection('partners')
    .where('status', '==', 'active')
    .get();

  for (const doc of partnersSnap.docs) {
    const data = doc.data();
    const companyName = (data.companyName || '') as string;
    const contactName = (data.contactName || '') as string;

    if (nameMatches(companyName, searchTerms) || nameMatches(contactName, searchTerms)) {
      matches.push({
        name: contactName || companyName,
        phone: normalizePhone(data.contactPhone as string),
        role: 'partner',
        id: doc.id,
        userId: (data.userId as string) || null,
        source: 'partners',
      });
    }
  }

  if (matches.length === 0) {
    return { found: false, reason: `No team member found matching "${params.name}"` };
  }

  if (matches.length === 1) {
    const match = matches[0];
    return {
      found: true,
      name: match.name,
      phone: match.phone,
      role: match.role,
      userId: match.userId,
      hasPhone: !!match.phone,
    };
  }

  // Multiple matches — return list for the AI to disambiguate
  return {
    found: true,
    multipleMatches: true,
    matches: matches.map((m) => ({
      name: m.name,
      role: m.role,
      hasPhone: !!m.phone,
      userId: m.userId,
    })),
  };
}

registerTool({
  name: 'lookupTeamMember',
  description:
    'Search for a team member by name. Returns their phone number and role. ' +
    'Use this when a caller asks to speak with a specific person.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name (or partial name) of the team member to find',
      },
    },
    required: ['name'],
  },
  handler: lookupTeamMemberHandler,
});
