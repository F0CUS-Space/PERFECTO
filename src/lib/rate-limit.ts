import "server-only";

import { headers } from "next/headers";

/**
 * Lightweight in-memory, fixed-window rate limiter.
 *
 * NOTE: state lives in the process memory, so on serverless/multi-instance hosts
 * (e.g. Vercel) each instance keeps its own counters — this is best-effort abuse
 * mitigation, not a hard global guarantee. For strict global limits, back this with
 * a shared store (Redis/Upstash) behind the same interface.
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

/**
 * Records one hit for `key` and reports whether it is within `limit` per `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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
