// Caller Identity Resolution — identifies who is calling by phone number

import { getAdminDb } from '@/lib/firebase/admin';

export interface CallerIdentity {
  type: 'contractor' | 'partner' | 'subscriber' | 'known_lead' | 'unknown';
  id?: string;
  userId?: string;
  name?: string;
  contractorId?: string;
}

/**
 * Resolve a caller's identity by phone number.
 * Searches contractors, users, leads, and partners.
 */
export async function resolveCallerIdentity(phone: string): Promise<CallerIdentity> {
  const db = getAdminDb();

  // Normalize phone for matching — strip to digits only
  const digits = phone.replace(/\D/g, '');
  const e164 = digits.length === 10 ? `+1${digits}` : digits.length === 11 ? `+${digits}` : phone;

  // Build search variants
  const phoneVariants = [phone, e164, digits];
  if (digits.length === 11 && digits.startsWith('1')) {
    phoneVariants.push(digits.substring(1)); // 10-digit version
  }

  // 1. Check contractors by phone
  for (const variant of phoneVariants) {
    const contractorSnap = await db
      .collection('contractors')
      .where('phone', '==', variant)
      .limit(1)
      .get();

    if (!contractorSnap.empty) {
      const contractor = contractorSnap.docs[0];
      const data = contractor.data();
      return {
        type: 'contractor',
        id: contractor.id,
        contractorId: contractor.id,
        userId: data.userId,
        name: data.displayName || data.businessName,
      };
    }
  }

  // 2. Check users by phone
  for (const variant of phoneVariants) {
    const userSnap = await db
      .collection('users')
      .where('phone', '==', variant)
      .limit(1)
      .get();

    if (!userSnap.empty) {
      const user = userSnap.docs[0];
      const data = user.data();
      const role = data.role;

      if (role === 'subscriber') {
        return {
          type: 'subscriber',
          id: user.id,
          userId: user.id,
          name: data.displayName,
        };
      }

      // Could be partner or other role
      return {
        type: role === 'contractor' ? 'contractor' : 'subscriber',
        id: user.id,
        userId: user.id,
        name: data.displayName,
      };
    }
  }

  // 3. Check partners by phone
  for (const variant of phoneVariants) {
    const partnerSnap = await db
      .collection('partners')
      .where('contactPhone', '==', variant)
      .limit(1)
      .get();

    if (!partnerSnap.empty) {
      const partner = partnerSnap.docs[0];
      const data = partner.data();
      return {
        type: 'partner',
        id: partner.id,
        userId: data.userId,
        name: data.companyName || data.contactName,
      };
    }
  }

  // 4. Check leads by phone
  for (const variant of phoneVariants) {
    const leadSnap = await db
      .collection('leads')
      .where('customer.phone', '==', variant)
      .limit(1)
      .get();

    if (!leadSnap.empty) {
      const lead = leadSnap.docs[0];
      const data = lead.data();
      return {
        type: 'known_lead',
        id: lead.id,
        name: data.customer?.name,
      };
    }
  }

  return { type: 'unknown' };
}
