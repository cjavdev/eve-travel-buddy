// In-memory cache so repeated map loads and tool calls don't re-hit the free APIs.
// It lives per server instance, which is plenty for a demo.
const TTL_MS = 12 * 60 * 60 * 1000;
const store = new Map<string, { at: number; value: unknown }>();

export async function cached<T>(key: string, fetcher: () => Promise<T>, ttl = TTL_MS): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  const value = await fetcher();
  store.set(key, { at: Date.now(), value });
  return value;
}

export async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  return res.json();
}
