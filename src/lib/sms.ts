import "server-only";

import { redactPhone } from "@/lib/redact";

/**
 * SMS abstraction.
 *
 * In Version 1.0, phone OTP is handled entirely by the Firebase Auth client SDK
 * (RecaptchaVerifier + signInWithPhoneNumber), so no server-side SMS provider is
 * required. This interface exists as a seam for future server-initiated SMS
 * (e.g. appointment reminders in V1.5, WhatsApp in V3.0).
 */
export interface SmsProvider {
  sendMessage(to: string, body: string): Promise<void>;
}

export const noopSmsProvider: SmsProvider = {
  async sendMessage(to, body) {
    console.warn(
      `[sms] No server SMS provider configured. Would send to ${redactPhone(to)} (${body.length} chars)`,
    );
  },
};
