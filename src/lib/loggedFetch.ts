// loggedFetch.ts
export async function loggedFetch(url: string, options?: RequestInit, context?: string): Promise<Response> {
  const start = Date.now();
  const res = await fetch(url, options);
  const end = Date.now();
  const log = {
    url,
    context: context || '',
    timestamp: new Date().toISOString(),
    durationMs: end - start,
    status: res.status,
  };
  // Log to console
  // eslint-disable-next-line no-console
  console.log('[API CALL]', log);
  // Log to localStorage (keep last 100 calls)
  try {
    const prev = JSON.parse(localStorage.getItem('api_call_log') || '[]');
    prev.push(log);
    if (prev.length > 100) prev.shift();
    localStorage.setItem('api_call_log', JSON.stringify(prev));
  } catch {
    // Ignore localStorage errors (quota, etc.)
  }
  return res;
} 