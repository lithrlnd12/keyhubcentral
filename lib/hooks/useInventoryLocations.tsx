'use client';

import { useState, useEffect, useCallback } from 'react';
import { InventoryLocation, LocationType } from '@/types/inventory';
import {
  getInventoryLocations,
  getInventoryLocation,
  getContractorLocation,
  getWarehouseLocations,
  getTruckLocations,
  subscribeToInventoryLocations,
  subscribeToInventoryLocation,
  createInventoryLocation,
  createTruckLocation,
  updateInventoryLocation,
  deactivateInventoryLocation,
} from '@/lib/firebase/inventoryLocations';

interface UseInventoryLocationsOptions {
  type?: LocationType;
  realtime?: boolean;
}

interface UseInventoryLocationsReturn {
  locations: InventoryLocation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInventoryLocations(
  options: UseInventoryLocationsOptions = {}
): UseInventoryLocationsReturn {
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInventoryLocations(options.type);
      setLocations(data);
    } catch (err) {
      setError('Failed to fetch inventory locations');
      console.error('useInventoryLocations error:', err);
    } finally {
      setLoading(false);
    }
  }, [options.type]);

  useEffect(() => {
    if (options.realtime) {
      const unsubscribe = subscribeToInventoryLocations((data) => {
        setLocations(data);
        setLoading(false);
      }, options.type);

      return () => unsubscribe();
    } else {
      fetchLocations();
    }
  }, [options.realtime, options.type, fetchLocations]);

  return {
    locations,
    loading,
    error,
    refetch: fetchLocations,
  };
}

interface UseInventoryLocationReturn {
  location: InventoryLocation | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInventoryLocation(
  id: string,
  options: { realtime?: boolean } = {}
): UseInventoryLocationReturn {
  const [location, setLocation] = useState<InventoryLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    if (!id) {
      setLocation(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getInventoryLocation(id);
      setLocation(data);
    } catch (err) {
      setError('Failed to fetch inventory location');
      console.error('useInventoryLocation error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLocation(null);
      setLoading(false);
      return;
    }

    if (options.realtime) {
      const unsubscribe = subscribeToInventoryLocation(id, (data) => {
        setLocation(data);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      fetchLocation();
    }
  }, [id, options.realtime, fetchLocation]);

  return {
    location,
    loading,
    error,
    refetch: fetchLocation,
  };
}

interface UseContractorLocationReturn {
  location: InventoryLocation | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useContractorLocation(
  contractorId: string
): UseContractorLocationReturn {
  const [location, setLocation] = useState<InventoryLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    if (!contractorId) {
      setLocation(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getContractorLocation(contractorId);
      setLocation(data);
    } catch (err) {
      setError('Failed to fetch contractor location');
      console.error('useContractorLocation error:', err);
    } finally {
      setLoading(false);
    }
  }, [contractorId]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return {
    location,
    loading,
    error,
    refetch: fetchLocation,
  };
}

interface UseWarehouseLocationsReturn {
  warehouses: InventoryLocation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWarehouseLocations(): UseWarehouseLocationsReturn {
  const [warehouses, setWarehouses] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWarehouseLocations();
      setWarehouses(data);
    } catch (err) {
      setError('Failed to fetch warehouse locations');
      console.error('useWarehouseLocations error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  return {
    warehouses,
    loading,
    error,
    refetch: fetchWarehouses,
  };
}

interface UseTruckLocationsReturn {
  trucks: InventoryLocation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTruckLocations(): UseTruckLocationsReturn {
  const [trucks, setTrucks] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrucks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTruckLocations();
      setTrucks(data);
    } catch (err) {
      setError('Failed to fetch truck locations');
      console.error('useTruckLocations error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrucks();
  }, [fetchTrucks]);

  return {
    trucks,
    loading,
    error,
    refetch: fetchTrucks,
  };
}

interface UseLocationMutationsReturn {
  createLocation: (
    data: Omit<InventoryLocation, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string>;
  createTruck: (contractorId: string, contractorName: string) => Promise<string>;
  updateLocation: (
    id: string,
    data: Partial<Omit<InventoryLocation, 'id' | 'createdAt'>>
  ) => Promise<void>;
  deactivateLocation: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useLocationMutations(): UseLocationMutationsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLocation = async (
    data: Omit<InventoryLocation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    try {
      setLoading(true);
      setError(null);
      const id = await createInventoryLocation(data);
      return id;
    } catch (err) {
      const message = 'Failed to create location';
      setError(message);
      console.error('createLocation error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const createTruck = async (
    contractorId: string,
    contractorName: string
  ): Promise<string> => {
    try {
      setLoading(true);
      setError(null);
      const id = await createTruckLocation(contractorId, contractorName);
      return id;
    } catch (err) {
      const message = 'Failed to create truck location';
      setError(message);
      console.error('createTruck error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async (
    id: string,
    data: Partial<Omit<InventoryLocation, 'id' | 'createdAt'>>
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await updateInventoryLocation(id, data);
    } catch (err) {
      const message = 'Failed to update location';
      setError(message);
      console.error('updateLocation error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const deactivateLocation = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await deactivateInventoryLocation(id);
    } catch (err) {
      const message = 'Failed to deactivate location';
      setError(message);
      console.error('deactivateLocation error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    createLocation,
    createTruck,
    updateLocation,
    deactivateLocation,
    loading,
    error,
  };
}
