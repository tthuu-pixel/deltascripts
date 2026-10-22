// Best-effort local cache. No image uploads or server-side image storage.
const name = 'deltascript-tikz-v1';
const maxEntries = 40;
export async function tikzCacheKey(document: string, endpoint: string): Promise<string | null> {
  try {
    if (!globalThis.caches || !globalThis.crypto?.subtle || !globalThis.location) return null;
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(endpoint + '\n' + document),
    );
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    return `${location.origin}/__tikz-cache/${hash}`;
  } catch {
    return null;
  }
}
export async function readTikzCache(key: string | null): Promise<string | null> {
  if (!key) return null;
  try {
    return (await (await (await caches.open(name)).match(key))?.text()) ?? null;
  } catch {
    return null;
  }
}
export async function writeTikzCache(key: string | null, base64: string): Promise<void> {
  // Large pictures can still be displayed; only small ones are retained across reloads.
  if (!key || base64.length > 600_000) return;
  try {
    const cache = await caches.open(name);
    await cache.put(key, new Response(base64, { headers: { 'Content-Type': 'text/plain' } }));
    const keys = await cache.keys();
    await Promise.all(
      keys.slice(0, Math.max(0, keys.length - maxEntries)).map((entry) => cache.delete(entry)),
    );
  } catch {
    /* Private mode or a full cache must never block a drawing. */
  }
}
