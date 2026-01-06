'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Search, Package, Wrench } from 'lucide-react';
import { useInventoryItems, useInventoryMutations } from '@/lib/hooks';
import { InventoryCategory } from '@/types/inventory';
import { Spinner } from '@/components/ui/Spinner';
import { InventoryItemCard } from '@/components/inventory';

export default function InventoryItemsPage() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') as InventoryCategory | null;

  const { items, loading, setCategory, setSearch, filters } = useInventoryItems({
    category: initialCategory || undefined,
    realtime: true,
  });
  const { deleteItem, loading: deleting } = useInventoryMutations();

  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory Items</h1>
          <p className="text-gray-400">
            Manage materials and tools
          </p>
        </div>
        <Link
          href="/kts/inventory/items/new"
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
        </form>

        <div className="flex gap-2">
          <button
            onClick={() => setCategory(undefined)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              !filters.category
                ? 'bg-gold text-black'
                : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setCategory('material')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              filters.category === 'material'
                ? 'bg-gold text-black'
                : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            <Package className="h-4 w-4" />
            Materials
          </button>
          <button
            onClick={() => setCategory('tool')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              filters.category === 'tool'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            <Wrench className="h-4 w-4" />
            Tools
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-gray-400 text-sm">
        {loading ? 'Loading...' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
      </p>

      {/* Items Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No items found</h3>
          <p className="text-gray-400 mb-4">
            {filters.search || filters.category
              ? 'Try adjusting your filters'
              : 'Add your first inventory item'}
          </p>
          <Link
            href="/kts/inventory/items/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="relative">
              <InventoryItemCard
                item={item}
                href={`/kts/inventory/items/${item.id}`}
                showActions
                onEdit={() => {
                  window.location.href = `/kts/inventory/items/${item.id}/edit`;
                }}
                onDelete={() => setDeleteConfirm(item.id)}
              />

              {/* Delete Confirmation Modal */}
              {deleteConfirm === item.id && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 max-w-sm w-full">
                    <h3 className="text-lg font-medium text-white mb-2">
                      Delete Item?
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Are you sure you want to delete &quot;{item.name}&quot;? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting}
                        className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
