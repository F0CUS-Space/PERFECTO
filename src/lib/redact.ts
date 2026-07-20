/** Mask a phone for logs — keep last 4 digits when present. */
export function redactPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}

/** Mask an email local-part for logs; keep domain for debugging deliverability. */
export function redactEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "[redacted]";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain) return "[redacted]";
  const masked = local.length <= 1 ? "*" : `${local[0]}***`;
  return `${masked}@${domain}`;
}
