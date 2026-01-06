'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useInventoryItem, useInventoryMutations, useAuth } from '@/lib/hooks';
import { InventoryItemForm } from '@/components/inventory';
import { Spinner } from '@/components/ui/Spinner';
import { InventoryItem } from '@/types/inventory';

export default function EditInventoryItemPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { user } = useAuth();
  const { item, loading: itemLoading, error: itemError } = useInventoryItem(id);
  const { updateItem, loading: updating, error: updateError } = useInventoryMutations();

  const canEdit = user?.role && ['owner', 'admin'].includes(user.role);

  const handleSubmit = async (
    data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      await updateItem(id, {
        ...data,
      });
      router.push(`/kts/inventory/items/${id}`);
    } catch (err) {
      console.error('Failed to update item:', err);
    }
  };

  if (itemLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (itemError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{itemError}</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Item not found</p>
        <Link
          href="/kts/inventory/items"
          className="mt-4 inline-flex items-center gap-2 text-brand-gold hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Items
        </Link>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">You do not have permission to edit inventory items</p>
        <Link
          href={`/kts/inventory/items/${id}`}
          className="mt-4 inline-flex items-center gap-2 text-brand-gold hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Item
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/kts/inventory/items/${id}`}
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
      {updateError && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {updateError}
        </div>
      )}

      {/* Form */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6">
        <InventoryItemForm
          item={item}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/kts/inventory/items/${id}`)}
          loading={updating}
        />
      </div>
    </div>
  );
}
