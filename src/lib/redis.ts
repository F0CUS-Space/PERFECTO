import "server-only";

import Redis from "ioredis";

import { env } from "@/env";

/**
 * Shared Redis client for rate limits and caching.
 *
 * - Lazy connect: no TCP attempt until the first command.
 * - When `REDIS_URL` is unset (typical bare `npm run dev` without Compose Redis),
 *   callers receive `null` and should fall back (in-memory rate limits / skip cache).
 * - When Redis is configured but unreachable, we warn once and return `null` so the
 *   app stays up (rate-limit falls back to process memory; cache becomes read-through).
 */

const globalForRedis = globalThis as unknown as {
  perfectoRedis?: Redis;
  perfectoRedisWarned?: boolean;
};

function warnRedisUnavailable(reason: unknown): void {
  if (globalForRedis.perfectoRedisWarned) return;
  globalForRedis.perfectoRedisWarned = true;
  console.warn(
    "[redis] Unavailable — falling back (in-memory rate limits; cache skipped).",
    reason instanceof Error ? reason.message : reason,
  );
}

export function isRedisConfigured(): boolean {
  return Boolean(env.REDIS_URL?.trim());
}

/** Returns a singleton ioredis client, or null when REDIS_URL is not set. */
export function getRedis(): Redis | null {
  const url = env.REDIS_URL?.trim();
  if (!url) return null;

  if (globalForRedis.perfectoRedis) {
    return globalForRedis.perfectoRedis;
  }

  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 2_000,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 1_000);
    },
  });

  client.on("error", (err) => {
    // Avoid crashing the process on transient network errors.
    warnRedisUnavailable(err);
  });

  globalForRedis.perfectoRedis = client;
  return client;
}

/**
 * Run `fn` with a ready Redis client. Returns `null` if Redis is not configured
 * or the connection/command fails (caller should degrade gracefully).
 */
export async function withRedis<T>(fn: (redis: Redis) => Promise<T>): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
    return await fn(redis);
  } catch (err) {
    warnRedisUnavailable(err);
    return null;
  }
}
