import "server-only";

import { withRedis } from "@/lib/redis";

/**
 * Small JSON cache over Redis.
 *
 * Key namespace: every key is stored as `perfecto:<key>`.
 * When Redis is down/unset, reads miss and writes/deletes no-op (DB read-through).
 *
 * TTL guidance (catalog):
 * - Services / add-ons / quote+estimate catalogs: ~180s — admin mutations invalidate.
 * - Active promotions listing: ~120s — invalidated on promotion CRUD.
 * - Public gallery (includes short-lived signed URLs): ~120s — invalidated on gallery CRUD.
 * - Do not cache auth sessions, payments, or booking availability here.
 */

const KEY_PREFIX = "perfecto:";

function namespaced(key: string): string {
  return key.startsWith(KEY_PREFIX) ? key : `${KEY_PREFIX}${key}`;
}

/** Well-known catalog cache keys (without the `perfecto:` prefix). */
export const CacheKeys = {
  servicesActive: "catalog:services:active",
  servicesHome: (limit: number) => `catalog:services:home:${limit}`,
  serviceSlug: (slug: string) => `catalog:services:slug:${slug}`,
  serviceSlugs: "catalog:services:slugs",
  addOnsActive: "catalog:addons:active",
  quoteCatalog: "catalog:quote",
  estimateCatalog: "catalog:estimate",
  promotionsActive: "catalog:promotions:active",
  galleryActive: "catalog:gallery:active",
} as const;

/** Catalog TTLs in seconds. */
export const CacheTtl = {
  /** Active services, add-ons, quote/estimate catalogs — stable until admin edits. */
  catalog: 180,
  /** Promotions page listing. */
  promotions: 120,
  /** Public gallery (signed URL resolution is expensive enough to cache briefly). */
  gallery: 120,
} as const;

export async function cacheGet<T>(key: string): Promise<T | null> {
  return withRedis(async (redis) => {
    const raw = await redis.get(namespaced(key));
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      await redis.del(namespaced(key));
      return null;
    }
  }).then((value) => value ?? null);
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (ttlSeconds <= 0) return;
  await withRedis(async (redis) => {
    await redis.set(namespaced(key), JSON.stringify(value), "EX", Math.floor(ttlSeconds));
  });
}

/**
 * Delete one key, or all keys matching a glob pattern (e.g. `catalog:services:*`).
 * Patterns use Redis SCAN + DEL (safe for production; avoids KEYS).
 */
export async function cacheDel(keyOrPattern: string): Promise<void> {
  const target = namespaced(keyOrPattern);
  const isPattern = target.includes("*") || target.includes("?") || target.includes("[");

  await withRedis(async (redis) => {
    if (!isPattern) {
      await redis.del(target);
      return;
    }

    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", target, "COUNT", 100);
      cursor = next;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  });
}

/** Read-through cache helper. */
export async function cacheRemember<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const value = await loader();
  // Cache lists (including []) and objects; skip null/undefined so misses stay cheap.
  if (value !== null && value !== undefined) {
    await cacheSet(key, value, ttlSeconds);
  }
  return value;
}

export async function invalidateCatalogCache(): Promise<void> {
  await Promise.all([
    cacheDel("catalog:services:*"),
    cacheDel("catalog:addons:*"),
    cacheDel(CacheKeys.quoteCatalog),
    cacheDel(CacheKeys.estimateCatalog),
  ]);
}

export async function invalidateGalleryCache(): Promise<void> {
  await cacheDel("catalog:gallery:*");
}

export async function invalidatePromotionsCache(): Promise<void> {
  await cacheDel("catalog:promotions:*");
}
