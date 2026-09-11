import { openDB } from 'idb';

const DB_NAME = 'app-cache';
const STORE_NAME = 'api-cache';
const CACHE_TIME = 20 *  1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

export async function getCached<T>(
  key: string,
): Promise<T | null> {
  const db = await dbPromise;

  const cache = await db.get(
    STORE_NAME,
    key,
  ) as CacheEntry<T> | undefined;

  if (!cache) {
    return null;
  }

  // Expired
  if (Date.now() - cache.timestamp > CACHE_TIME) {
    await db.delete(STORE_NAME, key);
    return null;
  }

  return cache.data;
}

export async function setCache<T>(
  key: string,
  data: T,
): Promise<void> {
  const db = await dbPromise;

  const cache: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };

  await db.put(
    STORE_NAME,
    cache,
    key,
  );
}

export async function invalidateCache(
  key: string,
): Promise<void> {
  const db = await dbPromise;

  await db.delete(
    STORE_NAME,
    key,
  );
}