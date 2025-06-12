// In-memory cache for parsed API data (not Response objects)
const cache: Record<string, { promise: Promise<any>; timestamp: number }> = {};
const DEFAULT_TTL = 2 * 60 * 1000; // 2 minutes

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