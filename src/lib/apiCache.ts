// In-memory cache for parsed API data (not Response objects)
const cache: Record<string, { promise: Promise<unknown>; timestamp: number }> = {};
const DEFAULT_TTL = 30 * 60 * 1000; // Increased from 2 minutes to 30 minutes

// Shared cache keys for cross-page data sharing
const SHARED_CACHE_PREFIX = 'shared_tournament_';

/**
 * cachedApiFetch caches the parsed data (not the Response object).
 * fetchFn should return Promise<T> where T is the parsed data (e.g., fetch(...).then(r => r.json())).
 */
export function cachedApiFetch<T>(url: string, fetchFn: () => Promise<T>, ttl: number = DEFAULT_TTL): Promise<T> {
  const now = Date.now();
  if (cache[url] && now - cache[url].timestamp < ttl) {
    return cache[url].promise as Promise<T>;
  }
  const promise = fetchFn();
  cache[url] = { promise, timestamp: now };
  // On error, clear cache so next call can retry
  promise.catch(() => { if (cache[url]?.promise === promise) delete cache[url]; });
  return promise;
}

/**
 * Shared cache for tournament data that can be accessed across pages
 * Uses localStorage for persistence across page navigation
 */
export function getSharedTournamentCache<T>(tournamentId: string | number, dataType: string): T | null {
  try {
    const cacheKey = `${SHARED_CACHE_PREFIX}${tournamentId}_${dataType}`;
    const timeKey = `${cacheKey}_time`;
    
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(timeKey);
    
    if (cachedData && cachedTime) {
      const age = Date.now() - parseInt(cachedTime);
      if (age < DEFAULT_TTL) {
        return JSON.parse(cachedData) as T;
      }
    }
  } catch (error) {
    console.warn('Error reading shared tournament cache:', error);
  }
  return null;
}

/**
 * Set shared tournament cache data
 */
export function setSharedTournamentCache<T>(tournamentId: string | number, dataType: string, data: T): void {
  try {
    const cacheKey = `${SHARED_CACHE_PREFIX}${tournamentId}_${dataType}`;
    const timeKey = `${cacheKey}_time`;
    
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(timeKey, Date.now().toString());
  } catch (error) {
    console.warn('Error setting shared tournament cache:', error);
  }
}

/**
 * Clear expired shared cache entries
 */
export function cleanupSharedCache(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    for (const key of keys) {
      if (key.startsWith(SHARED_CACHE_PREFIX) && key.endsWith('_time')) {
        const timestamp = parseInt(localStorage.getItem(key) || '0');
        if (now - timestamp > DEFAULT_TTL) {
          const dataKey = key.replace('_time', '');
          localStorage.removeItem(key);
          localStorage.removeItem(dataKey);
        }
      }
    }
  } catch (error) {
    console.warn('Error cleaning up shared cache:', error);
  }
} 