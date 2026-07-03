import "server-only";

import type { NotificationType } from "@prisma/client";

import { siteConfig } from "@/config/site";
import { env } from "@/env";
import { displayArrivalTime } from "@/lib/format-arrival-time";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

import {
  adminBookingCancelledEmail,
  adminBookingRescheduledEmail,
  adminNewBookingEmail,
} from "./emails/admin-booking-emails";

const BATCH_SIZE = 100;

function customerDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  phone: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.phone;
}

async function createNotificationsForUsers(
  userIds: string[],
  data: {
    type: NotificationType;
    title: string;
    body: string;
    href?: string | null;
  },
): Promise<void> {
  if (userIds.length === 0) return;

  try {
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      await prisma.notification.createMany({
        data: userIds.slice(i, i + BATCH_SIZE).map((userId) => ({
          userId,
          type: data.type,
          title: data.title,
          body: data.body,
          href: data.href ?? null,
        })),
      });
    }
  } catch (error) {
    console.error("[notifications] createMany failed", data.type, error);
  }
}

async function getAdminRecipients(): Promise<{ ids: string[]; emails: string[] }> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true },
  });

  const ids = admins.map((admin) => admin.id);
  const emails = [
    siteConfig.contact.email,
    ...admins.map((admin) => admin.email).filter(Boolean),
  ] as string[];

  return { ids: [...new Set(ids)], emails: [...new Set(emails)] };
}

async function getCustomerUserIds(): Promise<string[]> {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true },
  });
  return customers.map((customer) => customer.id);
}

async function emailAdmins(subject: string, html: string): Promise<void> {
  const { emails } = await getAdminRecipients();
  for (const to of emails) {
    try {
      await sendEmail({ to, subject, html });
    } catch (error) {
      console.error("[notifications] admin email failed", to, error);
    }
  }
}

async function loadBookingNotificationContext(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { firstName: true, lastName: true, phone: true, email: true } },
      service: { select: { name: true } },
    },
  });
}

export async function notifyAdminsNewBooking(bookingId: string): Promise<void> {
  const href = `/admin/bookings/${bookingId}`;
  const alreadyNotified = await prisma.notification.findFirst({
    where: { type: "ADMIN_NEW_BOOKING", href },
    select: { id: true },
  });
  if (alreadyNotified) return;

  const booking = await loadBookingNotificationContext(bookingId);
  if (!booking) return;

  const customerName = customerDisplayName(booking.user);
  const dateLabel = booking.scheduledDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const arrival = displayArrivalTime(booking.arrivalWindow);
  const title = "New booking confirmed";
  const body = `${customerName} booked ${booking.service.name} for ${dateLabel} at ${arrival}.`;

  const { ids } = await getAdminRecipients();
  await createNotificationsForUsers(ids, {
    type: "ADMIN_NEW_BOOKING",
    title,
    body,
    href,
  });

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const email = adminNewBookingEmail({
    customerName,
    serviceName: booking.service.name,
    scheduledDate: booking.scheduledDate,
    arrivalWindow: booking.arrivalWindow,
    bookingId: booking.id,
    appUrl,
  });
  await emailAdmins(email.subject, email.html);
}

export async function notifyAdminsBookingCancelled(bookingId: string): Promise<void> {
  const booking = await loadBookingNotificationContext(bookingId);
  if (!booking) return;

  const customerName = customerDisplayName(booking.user);
  const dateLabel = booking.scheduledDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const href = `/admin/bookings/${booking.id}`;
  const title = "Booking cancelled";
  const body = `${customerName} cancelled ${booking.service.name} scheduled for ${dateLabel}.`;

  const { ids } = await getAdminRecipients();
  await createNotificationsForUsers(ids, {
    type: "ADMIN_BOOKING_CANCELLED",
    title,
    body,
    href,
  });

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const email = adminBookingCancelledEmail({
    customerName,
    serviceName: booking.service.name,
    scheduledDate: booking.scheduledDate,
    bookingId: booking.id,
    appUrl,
  });
  await emailAdmins(email.subject, email.html);
}

export async function notifyAdminsBookingRescheduled(
  bookingId: string,
  previousDate: Date,
  previousArrivalWindow: string,
): Promise<void> {
  const booking = await loadBookingNotificationContext(bookingId);
  if (!booking) return;

  const customerName = customerDisplayName(booking.user);
  const oldDate = previousDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const newDate = booking.scheduledDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const href = `/admin/bookings/${booking.id}`;
  const title = "Booking rescheduled";
  const body = `${customerName} moved ${booking.service.name} from ${oldDate} (${displayArrivalTime(previousArrivalWindow)}) to ${newDate} (${displayArrivalTime(booking.arrivalWindow)}).`;

  const { ids } = await getAdminRecipients();
  await createNotificationsForUsers(ids, {
    type: "ADMIN_BOOKING_RESCHEDULED",
    title,
    body,
    href,
  });

  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const email = adminBookingRescheduledEmail({
    customerName,
    serviceName: booking.service.name,
    previousDate,
    previousArrivalWindow,
    scheduledDate: booking.scheduledDate,
    arrivalWindow: booking.arrivalWindow,
    bookingId: booking.id,
    appUrl,
  });
  await emailAdmins(email.subject, email.html);
}

export async function notifyCustomersServiceUpdate(params: {
  serviceName: string;
  slug: string;
  created?: boolean;
}): Promise<void> {
  const customerIds = await getCustomerUserIds();
  const title = params.created ? "New service available" : "Service updated";
  const body = params.created
    ? `${params.serviceName} is now available to book on Perfecto.`
    : `${params.serviceName} has been updated — check the latest details and pricing.`;

  await createNotificationsForUsers(customerIds, {
    type: "CUSTOMER_SERVICE_UPDATE",
    title,
    body,
    href: `/services/${params.slug}`,
  });
}

export async function notifyCustomersPromotion(params: {
  title: string;
  description: string;
  created?: boolean;
}): Promise<void> {
  const customerIds = await getCustomerUserIds();
  const title = params.created ? "New promotion" : "Promotion updated";
  const body = params.created
    ? `${params.title} — ${params.description}`
    : `${params.title} has been updated. ${params.description}`;

  await createNotificationsForUsers(customerIds, {
    type: "CUSTOMER_PROMOTION",
    title,
    body: body.slice(0, 280),
    href: "/promotions",
  });
}

export async function notifyCustomersGeneralUpdate(params: {
  title: string;
  body: string;
  href?: string;
}): Promise<void> {
  const customerIds = await getCustomerUserIds();
  await createNotificationsForUsers(customerIds, {
    type: "CUSTOMER_GENERAL_UPDATE",
    title: params.title,
    body: params.body,
    href: params.href ?? "/",
  });
}
