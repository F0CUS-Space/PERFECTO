import "server-only";

/**
 * Bounded outbound fetch for any future server→server HTTP calls.
 * Prevents hung sockets and unbounded retries from amplifying egress.
 */
export type SafeFetchOptions = RequestInit & {
  /** Overall timeout in ms (default 15s). */
  timeoutMs?: number;
  /** Log label for structured outbound logs. */
  label?: string;
};

export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 15_000, label = "outbound", ...init } = options;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Do not allow caller AbortSignal to silently disable our timeout —
  // race both if provided.
  if (init.signal) {
    if (init.signal.aborted) controller.abort();
    else {
      init.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      // Avoid accidental credential leakage to third parties.
      credentials: init.credentials ?? "omit",
      redirect: init.redirect ?? "error",
    });

    console.info(
      JSON.stringify({
        type: "outbound_http",
        label,
        url: redactUrl(url),
        status: response.status,
        durationMs: Date.now() - started,
      }),
    );

    return response;
  } catch (error) {
    console.error(
      JSON.stringify({
        type: "outbound_http_error",
        label,
        url: redactUrl(url),
        durationMs: Date.now() - started,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function redactUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return "[invalid-url]";
  }
}

/** Reject URLs that should never be fetched server-side (SSRF guard). */
export function assertSafeOutboundUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid outbound URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS outbound URLs are allowed.");
  }

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host) ||
    host === "169.254.169.254"
  ) {
    throw new Error("Blocked private/metadata outbound URL.");
  }

  return url;
}
