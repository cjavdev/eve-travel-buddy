// Tiny localStorage cache so a demo doesn't re-hit the free APIs on every reload.
const TTL_MS = 12 * 60 * 60 * 1000;

export async function cached(key, fetcher, ttl = TTL_MS) {
  try {
    const hit = JSON.parse(localStorage.getItem(key));
    if (hit && Date.now() - hit.at < ttl) return hit.value;
  } catch {}
  const value = await fetcher();
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), value }));
  } catch {}
  return value;
}

export async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  return res.json();
}
