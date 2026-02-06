'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  InventoryItem,
  InventoryFilters,
  InventoryCategory,
} from '@/types/inventory';
import {
  getInventoryItems,
  getInventoryItem,
  subscribeToInventoryItems,
  subscribeToInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '@/lib/firebase/inventory';

interface UseInventoryItemsOptions {
  category?: InventoryCategory;
  search?: string;
  realtime?: boolean;
  contractorId?: string; // Filter items by owner contractor
}

interface UseInventoryItemsReturn {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setCategory: (category?: InventoryCategory) => void;
  setSearch: (search: string) => void;
  filters: InventoryFilters;
}

export function useInventoryItems(
  options: UseInventoryItemsOptions = {}
): UseInventoryItemsReturn {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({
    category: options.category,
    search: options.search || '',
    contractorId: options.contractorId,
  });

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInventoryItems(filters);
      setItems(data);
    } catch (err) {
      setError('Failed to fetch inventory items');
      console.error('useInventoryItems error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // Don't fire queries if contractorId filter is expected but not yet available
    if (options.contractorId !== undefined && !filters.contractorId) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (options.realtime) {
      const unsubscribe = subscribeToInventoryItems((data) => {
        setItems(data);
        setLoading(false);
      }, filters, (err) => {
        console.error('useInventoryItems subscription error:', err);
        setError('Failed to load inventory items');
        setItems([]);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      fetchItems();
    }
  }, [options.realtime, options.contractorId, filters, fetchItems]);

  const setCategory = useCallback((category?: InventoryCategory) => {
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
    setCategory,
    setSearch,
    filters,
  };
}

interface UseInventoryItemReturn {
  item: InventoryItem | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInventoryItem(
  id: string,
  options: { realtime?: boolean } = {}
): UseInventoryItemReturn {
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItem = useCallback(async () => {
    if (!id) {
      setItem(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getInventoryItem(id);
      setItem(data);
    } catch (err) {
      setError('Failed to fetch inventory item');
      console.error('useInventoryItem error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setItem(null);
      setLoading(false);
      return;
    }

    if (options.realtime) {
      const unsubscribe = subscribeToInventoryItem(id, (data) => {
        setItem(data);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      fetchItem();
    }
  }, [id, options.realtime, fetchItem]);

  return {
    item,
    loading,
    error,
    refetch: fetchItem,
  };
}

interface UseInventoryMutationsReturn {
  createItem: (
    data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string>;
  updateItem: (
    id: string,
    data: Partial<Omit<InventoryItem, 'id' | 'createdAt'>>
  ) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useInventoryMutations(): UseInventoryMutationsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createItem = async (
    data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    try {
      setLoading(true);
      setError(null);
      const id = await createInventoryItem(data);
      return id;
    } catch (err) {
      const message = 'Failed to create inventory item';
      setError(message);
      console.error('createItem error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (
    id: string,
    data: Partial<Omit<InventoryItem, 'id' | 'createdAt'>>
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await updateInventoryItem(id, data);
    } catch (err) {
      const message = 'Failed to update inventory item';
      setError(message);
      console.error('updateItem error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await deleteInventoryItem(id);
    } catch (err) {
      const message = 'Failed to delete inventory item';
      setError(message);
      console.error('deleteItem error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    createItem,
    updateItem,
    deleteItem,
    loading,
    error,
  };
}
