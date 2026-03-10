import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, ToolDefinition, CallContext } from '@/lib/vapi/toolRegistry';

/**
 * Normalize a phone number to multiple search formats.
 * Returns an array of formats to try: +1XXXXXXXXXX, XXXXXXXXXX, raw input.
 */
function getPhoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, '');
  const variants = new Set<string>();

  // Always include the raw input
  variants.add(phone);

  if (digits.length === 10) {
    // US 10-digit: add with and without +1
    variants.add(digits);
    variants.add(`+1${digits}`);
    variants.add(`1${digits}`);
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // US 11-digit with leading 1
    const ten = digits.slice(1);
    variants.add(digits);
    variants.add(ten);
    variants.add(`+${digits}`);
  } else {
    // Fallback: include digits as-is
    variants.add(digits);
  }

  return Array.from(variants);
}

const lookupPartnerInfo: ToolDefinition = {
  name: 'lookupPartnerInfo',
  description:
    'Look up a partner by phone number. Returns partner details and associated properties ' +
    'if found. Defaults to the caller phone number if none is provided.',
  parameters: {
    phone: {
      type: 'string',
      description: 'Phone number to search for. Defaults to the caller phone if omitted.',
    },
  },

  async handler(
    params: Record<string, unknown>,
    ctx: CallContext
  ): Promise<unknown> {
    const db = getAdminDb();
    const rawPhone = (params.phone as string | undefined) || ctx.callerPhone;

    if (!rawPhone) {
      return { found: false, reason: 'No phone number available to search' };
    }

    const variants = getPhoneVariants(rawPhone);

    // Query the partners collection trying each phone format
    for (const phoneVariant of variants) {
      const snap = await db
        .collection('partners')
        .where('contactPhone', '==', phoneVariant)
        .limit(1)
        .get();

      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = doc.data();

        // Fetch associated properties if any
        const propertiesSnap = await db
          .collection('partners')
          .doc(doc.id)
          .collection('properties')
          .get();

        const properties = propertiesSnap.docs.map((pDoc) => {
          const pData = pDoc.data();
          return {
            propertyId: pDoc.id,
            address: pData.address || '',
            type: pData.type || '',
            status: pData.status || '',
          };
        });

        return {
          found: true,
          partnerId: doc.id,
          companyName: data.companyName || '',
          contactName: data.contactName || '',
          properties,
        };
      }
    }

    return { found: false };
  },
};

registerTool(lookupPartnerInfo);

export default lookupPartnerInfo;
