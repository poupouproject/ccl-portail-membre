import { useCallback } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Cache global simple (en mémoire)
const globalCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useDataCache() {
  const getFromCache = useCallback(<T,>(key: string): T | null => {
    const entry = globalCache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    
    // Vérifier si le cache a expiré
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      globalCache.delete(key);
      return null;
    }
    
    return entry.data;
  }, []);

  const setCache = useCallback(<T,>(key: string, data: T) => {
    globalCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }, []);

  const clearCache = useCallback((pattern?: string) => {
    if (!pattern) {
      globalCache.clear();
      return;
    }
    
    for (const key of globalCache.keys()) {
      if (key.includes(pattern)) {
        globalCache.delete(key);
      }
    }
  }, []);

  return { getFromCache, setCache, clearCache };
}
