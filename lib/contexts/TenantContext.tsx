'use client';

import { createContext, useContext, ReactNode } from 'react';
import { TenantPortalConfig } from '@/types/tenant-portal';

interface TenantContextType {
  tenant: TenantPortalConfig;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantPortalConfig;
  children: ReactNode;
}) {
  return (
    <TenantContext.Provider value={{ tenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
