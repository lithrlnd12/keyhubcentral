'use client';

import { useState } from 'react';
import { Store } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { MarketplaceFeed } from '@/components/marketplace/MarketplaceFeed';
import { MarketplaceDashboard } from '@/components/marketplace/MarketplaceDashboard';
import { CreateListingForm } from '@/components/marketplace/CreateListingForm';
import { useAuth } from '@/lib/hooks/useAuth';
import { useNetworkConfig } from '@/lib/hooks/useNetworkConfig';
import { tenant } from '@/lib/config/tenant';

export default function KTSMarketplacePage() {
  const { user } = useAuth();
  const { networkIds, canPullMarketplace, sharingMarketplace } = useNetworkConfig();
  const [activeTab, setActiveTab] = useState('browse');

  // Only owner, admin, and pm can access this page
  const canAccess = user?.role && ['owner', 'admin', 'pm'].includes(user.role);

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">You do not have permission to access the marketplace.</p>
      </div>
    );
  }

  const handleListingCreated = () => {
    setActiveTab('my-listings');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Store className="w-6 h-6 text-brand-gold" />
          <h2 className="text-xl font-bold text-white">Labor Marketplace</h2>
        </div>
        <p className="text-gray-400">
          Post available work and browse listings from other dealers
        </p>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="browse">Browse Listings</TabsTrigger>
          <TabsTrigger value="my-listings">My Listings</TabsTrigger>
          <TabsTrigger value="create">Create Listing</TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          <MarketplaceFeed
            mode="dealer"
            networkIds={canPullMarketplace ? networkIds : undefined}
          />
        </TabsContent>

        <TabsContent value="my-listings">
          <MarketplaceDashboard
            dealerId={user?.uid || ''}
            onCreateListing={() => setActiveTab('create')}
          />
        </TabsContent>

        <TabsContent value="create">
          <CreateListingForm
            dealerId={user?.uid || ''}
            dealerName={user?.displayName || user?.email || 'Unknown Dealer'}
            onSuccess={handleListingCreated}
            networkOptions={
              sharingMarketplace && networkIds.length > 0
                ? { networkId: networkIds[0], sourceTenantId: tenant.firebaseProjectId }
                : undefined
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
