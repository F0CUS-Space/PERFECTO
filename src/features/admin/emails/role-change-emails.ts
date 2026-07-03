import { siteConfig } from "@/config/site";
import { escapeHtml } from "@/lib/escape-html";
import { emailLayout } from "@/features/notifications/emails/booking-emails";

function displayName(name: string): string {
  return escapeHtml(name);
}

export function adminAccessGrantedEmail(params: { name: string; appUrl: string }) {
  const adminUrl = `${params.appUrl.replace(/\/$/, "")}/admin`;
  const body = `
    <p>Hi ${displayName(params.name)},</p>
    <p>You have been granted <strong>admin access</strong> to ${escapeHtml(siteConfig.name)}.</p>
    <p>Sign in with your phone number and open the admin portal to manage bookings, services, and more.</p>
    <p style="margin-top: 20px;">
      <a href="${adminUrl}" style="display: inline-block; padding: 12px 20px; background: #0066cc; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;">
        Open admin portal
      </a>
    </p>
    <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
      If you did not expect this change, contact ${escapeHtml(siteConfig.contact.email)}.
    </p>
  `;
  return emailLayout(body, params.appUrl);
}

export function adminAccessRevokedEmail(params: { name: string; appUrl: string }) {
  const dashboardUrl = `${params.appUrl.replace(/\/$/, "")}/dashboard`;
  const body = `
    <p>Hi ${displayName(params.name)},</p>
    <p>Your <strong>admin access</strong> to ${escapeHtml(siteConfig.name)} has been removed.</p>
    <p>Your customer account is still active — you can continue to book services and manage your bookings.</p>
    <p style="margin-top: 20px;">
      <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 20px; background: #0066cc; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;">
        Go to my dashboard
      </a>
    </p>
    <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
      Questions? Contact ${escapeHtml(siteConfig.contact.email)}.
    </p>
  `;
  return emailLayout(body, params.appUrl);
}
