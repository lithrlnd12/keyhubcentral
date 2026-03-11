'use client';

import { TenantPortalConfig } from '@/types/tenant-portal';
import { LogOut, User } from 'lucide-react';

interface TenantHeaderProps {
  tenant: TenantPortalConfig;
  customerName?: string;
  onSignOut?: () => void;
}

export function TenantHeader({ tenant, customerName, onSignOut }: TenantHeaderProps) {
  const { branding, companyName } = tenant;

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: branding.backgroundColor || '#1A1A1A',
        borderColor: `${branding.primaryColor}33`,
      }}
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={companyName}
              className="h-8 w-auto"
            />
          ) : (
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white text-sm"
              style={{ backgroundColor: branding.primaryColor }}
            >
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <span
            className="font-semibold text-lg"
            style={{ color: branding.textColor || '#FFFFFF' }}
          >
            {companyName}
          </span>
        </div>

        {customerName && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <User size={16} />
              <span className="hidden sm:inline">{customerName}</span>
            </div>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
