import "server-only";

import { headers } from "next/headers";

import { withRedis } from "@/lib/redis";

/**
 * Global fixed-window rate limiter backed by Redis (INCR + PEXPIRE via Lua).
 *
 * Keys are shared across all app instances that use the same REDIS_URL.
 * If Redis is unset or unavailable, falls back to the in-process Map limiter
 * (best-effort per instance) after a one-time console.warn from the Redis module.
 *
 * Callers keep the same keying scheme, e.g. `auth-session:${ip}`.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Evict expired buckets once the map grows, to bound memory use. */
function sweep(now: number): void {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/**
 * Atomic fixed-window increment.
 * KEYS[1] = rate key, ARGV[1] = window ms.
 * Returns { count, pttl }.
 */
const FIXED_WINDOW_LUA = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { current, ttl }
`;

async function redisRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  const redisKey = `perfecto:rl:${key}`;
  const window = Math.max(1, Math.floor(windowMs));

  return withRedis(async (redis) => {
    const result = (await redis.eval(FIXED_WINDOW_LUA, 1, redisKey, String(window))) as [
      number,
      number,
    ];
    const count = Number(result[0]);
    const pttl = Number(result[1]);
    const retryAfterSeconds = Math.max(1, Math.ceil(pttl / 1000));

    if (count > limit) {
      return { ok: false, remaining: 0, retryAfterSeconds };
    }

    return {
      ok: true,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: 0,
    };
  });
}

/**
 * Records one hit for `key` and reports whether it is within `limit` per `windowMs`.
 * Prefer Redis when available; otherwise use in-memory fallback.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const fromRedis = await redisRateLimit(key, limit, windowMs);
  if (fromRedis) return fromRedis;
  return memoryRateLimit(key, limit, windowMs);
}

/** Best-effort client IP from a Request (route handlers). */
export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Best-effort client IP from the incoming request headers (server actions / RSC). */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headerList.get("x-real-ip")?.trim() || "unknown";
}
