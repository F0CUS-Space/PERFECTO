"use client";

import Link from "next/link";
import type { ApplicationStatus } from "@prisma/client";

import { AdminServiceCard } from "@/features/admin/components/admin-service-card";
import type {
  AdminApplicationRow,
  AdminAuditLogRow,
  AdminBookingRow,
  AdminCustomerRow,
  AdminJobPostingRow,
  AdminPaymentRow,
  AdminServiceRow,
} from "@/features/admin/types";
import { BookingStatusBadge } from "@/features/dashboard/components/booking-status-badge";
import { LIST_LOAD_MORE, LIST_PAGE_SIZE } from "@/config/list-display";
import { ViewMoreSection } from "@/components/shared/view-more";
import { formatCurrency, cn } from "@/lib/utils";

const APPLICATION_STATUS_STYLES: Record<ApplicationStatus, string> = {
  SUBMITTED: "bg-amber-100 text-amber-800",
  UNDER_REVIEW: "bg-brand-blue/10 text-brand-blue",
  ACCEPTED: "bg-accent/15 text-brand-green",
  REJECTED: "bg-destructive/10 text-destructive",
};

const PAYMENT_TYPE_LABELS = {
  DEPOSIT: "Payment",
  BALANCE: "Balance",
  REFUND: "Refund",
} as const;

const PAYMENT_STATUS_STYLES = {
  PENDING: "text-amber-700",
  SUCCEEDED: "text-brand-green",
  FAILED: "text-destructive",
  REFUNDED: "text-muted-foreground",
} as const;

export function PaginatedBookingsTable({ bookings }: { bookings: AdminBookingRow[] }) {
  return (
    <ViewMoreSection
      items={bookings}
      initialCount={LIST_PAGE_SIZE.TABLE}
      step={LIST_LOAD_MORE.TABLE}
      itemLabel="bookings"
    >
      {(visible) => (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Service</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Scheduled</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Location</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Paid</th>
                <th className="px-4 py-3 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {visible.map((booking) => (
                <tr key={booking.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-navy">{booking.customerName}</p>
                    <p className="text-xs text-muted-foreground">{booking.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{booking.serviceName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(booking.scheduledDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    <br />
                    <span className="text-xs">{booking.arrivalWindow}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{booking.city}</td>
                  <td className="px-4 py-3">
                    <BookingStatusBadge status={booking.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatCurrency(booking.amountPaid)} / {formatCurrency(booking.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="font-medium text-brand-blue hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ViewMoreSection>
  );
}

export function PaginatedCustomersTable({ customers }: { customers: AdminCustomerRow[] }) {
  return (
    <ViewMoreSection
      items={customers}
      initialCount={LIST_PAGE_SIZE.TABLE}
      step={LIST_LOAD_MORE.TABLE}
      itemLabel="customers"
    >
      {(visible) => (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Bookings</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Joined</th>
                <th className="px-4 py-3 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {visible.map((customer) => {
                const name =
                  [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—";
                return (
                  <tr key={customer.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium text-brand-navy">{name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{customer.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{customer.email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{customer.bookingCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="font-medium text-brand-blue hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ViewMoreSection>
  );
}

export function PaginatedPaymentsTable({ payments }: { payments: AdminPaymentRow[] }) {
  return (
    <ViewMoreSection
      items={payments}
      initialCount={LIST_PAGE_SIZE.TABLE}
      step={LIST_LOAD_MORE.TABLE}
      itemLabel="payments"
    >
      {(visible) => (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Service</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {visible.map((payment) => (
                <tr key={payment.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(payment.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-navy">{payment.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{payment.serviceName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {PAYMENT_TYPE_LABELS[payment.type]}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 font-medium capitalize",
                      PAYMENT_STATUS_STYLES[payment.status],
                    )}
                  >
                    {payment.status.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/bookings/${payment.bookingId}`}
                      className="text-brand-blue hover:underline"
                    >
                      Booking
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ViewMoreSection>
  );
}

export function PaginatedJobsTable({ jobs }: { jobs: AdminJobPostingRow[] }) {
  return (
    <ViewMoreSection
      items={jobs}
      initialCount={LIST_PAGE_SIZE.TABLE}
      step={LIST_LOAD_MORE.TABLE}
      itemLabel="jobs"
    >
      {(visible) => (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Location</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Compensation</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Applications</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {visible.map((job) => (
                <tr key={job.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-navy">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{job.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{job.location}</td>
                  <td className="px-4 py-3 text-muted-foreground">{job.compensation}</td>
                  <td className="px-4 py-3 text-muted-foreground">{job.applicationCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        job.isActive
                          ? "bg-accent/15 text-brand-green"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {job.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/jobs/${job.id}`}
                      className="font-medium text-brand-blue hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ViewMoreSection>
  );
}

export function PaginatedApplicationsTable({
  applications,
}: {
  applications: AdminApplicationRow[];
}) {
  return (
    <ViewMoreSection
      items={applications}
      initialCount={LIST_PAGE_SIZE.TABLE}
      step={LIST_LOAD_MORE.TABLE}
      itemLabel="applications"
    >
      {(visible) => (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Applicant</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Position</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Resume</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Applied</th>
                <th className="px-4 py-3 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {visible.map((app) => (
                <tr key={app.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-navy">{app.fullName}</p>
                    <p className="text-xs text-muted-foreground">{app.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{app.position}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {app.hasResume ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        APPLICATION_STATUS_STYLES[app.status],
                      )}
                    >
                      {app.status.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/applications/${app.id}`}
                      className="font-medium text-brand-blue hover:underline"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ViewMoreSection>
  );
}

export function PaginatedServicesGrid({ services }: { services: AdminServiceRow[] }) {
  return (
    <ViewMoreSection
      items={services}
      initialCount={LIST_PAGE_SIZE.CARD_GRID}
      step={LIST_LOAD_MORE.CARD_GRID}
      itemLabel="services"
    >
      {(visible) => (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((service) => (
            <AdminServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </ViewMoreSection>
  );
}

export function PaginatedCustomerBookingsTable({
  bookings,
}: {
  bookings: AdminBookingRow[];
}) {
  return (
    <ViewMoreSection
      items={bookings}
      initialCount={LIST_PAGE_SIZE.TABLE}
      step={LIST_LOAD_MORE.TABLE}
      itemLabel="bookings"
    >
      {(visible) => (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Service</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Paid</th>
                <th className="px-4 py-3 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {visible.map((booking) => (
                <tr key={booking.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-brand-navy">{booking.serviceName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(booking.scheduledDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <BookingStatusBadge status={booking.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatCurrency(booking.amountPaid)} / {formatCurrency(booking.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="text-brand-blue hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ViewMoreSection>
  );
}

export function PaginatedAdminsTable({
  admins,
  currentAdminId,
}: {
  admins: AdminCustomerRow[];
  currentAdminId: string;
}) {
  function displayName(firstName: string | null, lastName: string | null) {
    return [firstName, lastName].filter(Boolean).join(" ") || "—";
  }

  return (
    <ViewMoreSection
      items={admins}
      initialCount={LIST_PAGE_SIZE.TABLE}
      step={LIST_LOAD_MORE.TABLE}
      itemLabel="admins"
    >
      {(visible) => (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Role</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((admin) => (
                <tr key={admin.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-brand-navy">
                    {displayName(admin.firstName, admin.lastName)}
                    {admin.id === currentAdminId && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{admin.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{admin.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-brand-blue/15 px-2.5 py-0.5 text-xs font-semibold text-brand-blue">
                      Admin
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ViewMoreSection>
  );
}

export function PaginatedAdminBookingsPreview({
  bookings,
}: {
  bookings: AdminBookingRow[];
}) {
  return (
    <ViewMoreSection
      items={bookings}
      initialCount={LIST_PAGE_SIZE.PREVIEW}
      step={LIST_LOAD_MORE.PREVIEW}
      itemLabel="bookings"
    >
      {(visible) => (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Service</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Paid</th>
                <th className="px-4 py-3 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {visible.map((booking) => (
                <tr key={booking.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-brand-navy">{booking.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{booking.serviceName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(booking.scheduledDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <BookingStatusBadge status={booking.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatCurrency(booking.amountPaid)} / {formatCurrency(booking.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="text-brand-blue hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ViewMoreSection>
  );
}

export function PaginatedAuditLogTable({ logs }: { logs: AdminAuditLogRow[] }) {
  return (
    <ViewMoreSection
      items={logs}
      initialCount={LIST_PAGE_SIZE.TABLE}
      step={LIST_LOAD_MORE.TABLE}
      itemLabel="entries"
    >
      {(visible) => (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">When</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Admin</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Details</th>
                <th className="px-4 py-3 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {visible.map((log) => (
                <tr key={log.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-navy">{log.actorName}</p>
                    <p className="text-xs text-muted-foreground">{log.actorPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.actionLabel}</td>
                  <td className="px-4 py-3 text-foreground/80">{log.summary}</td>
                  <td className="px-4 py-3 text-right">
                    {log.entityHref ? (
                      <Link href={log.entityHref} className="text-brand-blue hover:underline">
                        View
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ViewMoreSection>
  );
}
