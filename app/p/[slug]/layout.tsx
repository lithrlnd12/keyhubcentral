'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getTenantBySlug } from '@/lib/firebase/tenants';
import { TenantProvider } from '@/lib/contexts/TenantContext';
import { TenantPortalConfig } from '@/types/tenant-portal';

export default function WhiteLabelPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const slug = params.slug as string;
  const [tenant, setTenant] = useState<TenantPortalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;

    async function loadTenant() {
      try {
        const config = await getTenantBySlug(slug);
        if (config) {
          setTenant(config);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadTenant();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#D4A84B] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Portal Not Found</h1>
          <p className="text-gray-400">
            This customer portal doesn&apos;t exist or is no longer active.
          </p>
        </div>
      </div>
    );
  }

  // Inject tenant CSS variables for dynamic theming
  const cssVars = {
    '--tenant-primary': tenant.branding.primaryColor,
    '--tenant-accent': tenant.branding.accentColor || tenant.branding.primaryColor,
    '--tenant-bg': tenant.branding.backgroundColor || '#1A1A1A',
    '--tenant-text': tenant.branding.textColor || '#FFFFFF',
  } as React.CSSProperties;

  return (
    <TenantProvider tenant={tenant}>
      <div style={cssVars} className="min-h-screen" data-tenant={tenant.slug}>
        {children}
      </div>
    </TenantProvider>
  );
}
