type CacheEntry<T> = { data: T; at: number };
const store = new Map<string, CacheEntry<unknown>>();

/** Return cached data (if fresh) + kick off a revalidation in the background. */
export function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 30_000,
): { data: T | null; revalidate: () => Promise<T> } {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  const fresh = entry && Date.now() - entry.at < ttlMs ? entry.data : null;

  const revalidate = async () => {
    const data = await fetcher();
    store.set(key, { data, at: Date.now() });
    return data;
  };

  return { data: fresh, revalidate };
}

export function invalidate(key: string) {
  store.delete(key);
}

export function invalidatePrefix(prefix: string) {
  Array.from(store.keys()).forEach(k => {
    if (k.startsWith(prefix)) store.delete(k);
  });
}
