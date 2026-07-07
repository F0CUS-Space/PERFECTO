import "server-only";

import { env } from "@/env";
import { siteConfig } from "@/config/site";

/** Pre-launch inbox — override with CONTACT_INBOX when going live. */
export const PRE_LAUNCH_CONTACT_INBOX = "perfectocleanings@gmail.com";

export function resolveContactInbox(): string {
  const configured = env.CONTACT_INBOX?.trim();
  if (configured) return configured;
  return PRE_LAUNCH_CONTACT_INBOX;
}

/** Production business inbox after launch (site config fallback). */
export function resolveLiveContactInbox(): string {
  return env.CONTACT_INBOX?.trim() || siteConfig.contact.email;
}
