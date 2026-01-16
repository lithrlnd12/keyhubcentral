'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect old earnings page to new financials page
export default function EarningsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/portal/financials');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
    </div>
  );
}
