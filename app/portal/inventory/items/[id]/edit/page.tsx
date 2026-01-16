'use client';

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useInventoryItem, useInventoryMutations, useAuth } from '@/lib/hooks';
import { InventoryItemForm } from '@/components/inventory';
import { InventoryItem } from '@/types/inventory';
import { Spinner } from '@/components/ui/Spinner';

export default function EditContractorInventoryItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;
  const { user } = useAuth();
  const { item, loading: itemLoading } = useInventoryItem(itemId, { realtime: true });
  const { updateItem, loading, error } = useInventoryMutations();

  const handleSubmit = async (
    data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      await updateItem(itemId, data);
      router.push('/portal/inventory/items');
    } catch (err) {
      console.error('Failed to update item:', err);
    }
  };

  if (itemLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-white mb-2">Item Not Found</h2>
        <p className="text-gray-400 mb-4">
          The inventory item you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/portal/inventory/items"
          className="text-gold hover:underline"
        >
          Back to Items
        </Link>
      </div>
    );
  }

  // Ensure contractor can only edit their own items
  if (item.contractorId !== user?.uid) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-gray-400 mb-4">
          You don&apos;t have permission to edit this item.
        </p>
        <Link
          href="/portal/inventory/items"
          className="text-gold hover:underline"
        >
          Back to Items
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/portal/inventory/items"
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Item</h1>
          <p className="text-gray-400">{item.name}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6">
        <InventoryItemForm
          item={item}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/portal/inventory/items')}
          loading={loading}
          contractorId={user?.uid}
        />
      </div>
    </div>
  );
}
