import "server-only";

import { env } from "@/env";
import { siteConfig } from "@/config/site";

/** Default inbox when CONTACT_INBOX is unset. */
export const PRE_LAUNCH_CONTACT_INBOX = "info@perfectodmv.com";

export function resolveContactInbox(): string {
  const configured = env.CONTACT_INBOX?.trim();
  if (configured) return configured;
  return PRE_LAUNCH_CONTACT_INBOX;
}

/** Production business inbox (site config fallback). */
export function resolveLiveContactInbox(): string {
  return env.CONTACT_INBOX?.trim() || siteConfig.contact.email;
}
