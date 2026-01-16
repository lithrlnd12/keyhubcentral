'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useInventoryMutations, useAuth } from '@/lib/hooks';
import { InventoryItemForm } from '@/components/inventory';
import { InventoryItem } from '@/types/inventory';

export default function NewContractorInventoryItemPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { createItem, loading, error } = useInventoryMutations();

  const handleSubmit = async (
    data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      await createItem({
        ...data,
        createdBy: user?.uid || '',
        contractorId: user?.uid, // Set the owner contractor
      });
      router.push('/portal/inventory/items');
    } catch (err) {
      console.error('Failed to create item:', err);
    }
  };

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
          <h1 className="text-2xl font-bold text-white">Add Inventory Item</h1>
          <p className="text-gray-400">Create a new material or tool</p>
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
          onSubmit={handleSubmit}
          onCancel={() => router.push('/portal/inventory/items')}
          loading={loading}
          contractorId={user?.uid}
        />
      </div>
    </div>
  );
}
