// Simple in-memory cache for Firestore data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache stats for debugging
  getStats(): { size: number; keys: string[] } {
    const keys: string[] = [];
    this.cache.forEach((_, key) => keys.push(key));
    return {
      size: this.cache.size,
      keys,
    };
  }
}

// Singleton instance
export const cache = new MemoryCache();

// Cache key generators
export const cacheKeys = {
  contractors: (filters?: string) => `contractors:${filters || 'all'}`,
  contractor: (id: string) => `contractor:${id}`,
  jobs: (filters?: string) => `jobs:${filters || 'all'}`,
  job: (id: string) => `job:${id}`,
  leads: (filters?: string) => `leads:${filters || 'all'}`,
  lead: (id: string) => `lead:${id}`,
  invoices: (filters?: string) => `invoices:${filters || 'all'}`,
  invoice: (id: string) => `invoice:${id}`,
  campaigns: (filters?: string) => `campaigns:${filters || 'all'}`,
  campaign: (id: string) => `campaign:${id}`,
  user: (id: string) => `user:${id}`,
  dashboardStats: () => 'dashboard:stats',
};

// Wrapper for caching async functions
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetchFn();
  cache.set(key, data, ttl);
  return data;
}
