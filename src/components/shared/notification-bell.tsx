"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  markAllNotificationsAsRead,
  markNotificationsAsRead,
} from "@/features/notifications/actions";
import { useNotificationSignal } from "@/features/notifications/use-notification-signal";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Safety poll when Firestore realtime is unavailable (no UID, auth mismatch, or rules error). */
const FALLBACK_POLL_MS = 120_000;

export function NotificationBell({
  className,
  firebaseUid,
}: {
  className?: string;
  /** Firebase Auth UID — must match signed-in client for Firestore rules. */
  firebaseUid?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const loadRef = useRef<(options?: { silent?: boolean }) => Promise<void>>(async () => {});

  const updatePanelPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const margin = 16;
    const width = Math.min(352, window.innerWidth - margin * 2);
    const rect = button.getBoundingClientRect();
    let left = rect.right - width;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    setPanelStyle({
      position: "fixed",
      top: rect.bottom + 8,
      left,
      width,
      zIndex: 50,
    });
  }, []);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        notifications: NotificationItem[];
        unreadCount: number;
      };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  loadRef.current = load;

  const onSignal = useCallback(() => {
    void loadRef.current({ silent: true });
  }, []);

  const realtimeActive = useNotificationSignal(firebaseUid, onSignal);
  const useFallbackPoll = !realtimeActive;

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!useFallbackPoll) return;

    const poll = () => {
      if (document.visibilityState !== "visible") return;
      void loadRef.current({ silent: true });
    };

    const interval = window.setInterval(poll, FALLBACK_POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadRef.current({ silent: true });
      }
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [useFallbackPoll]);

  useEffect(() => {
    if (!open) return;
    void load({ silent: true });
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  const onOpen = () => {
    setOpen((value) => !value);
    if (!open) void load();
  };

  const onMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((items) =>
      items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
    );
    setUnreadCount(0);
  };

  const onItemClick = async (item: NotificationItem) => {
    if (!item.readAt) {
      await markNotificationsAsRead([item.id]);
      setNotifications((items) =>
        items.map((entry) =>
          entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setOpen(false);
  };

  return (
    <div ref={panelRef} className={cn("relative", className)}>
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Notifications"
        onClick={onOpen}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          style={panelStyle}
          className="max-h-[min(20rem,calc(100dvh-6rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-semibold text-brand-navy">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void onMarkAllRead()}
                className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline"
              >
                <Check className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center px-4 py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              <ul>
                {notifications.map((item) => {
                  const content = (
                    <>
                      <p className="font-medium text-brand-navy">{item.title}</p>
                      <p className="mt-1 break-words text-sm text-muted-foreground line-clamp-2 [overflow-wrap:anywhere]">
                        {item.body}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </>
                  );

                  return (
                    <li key={item.id} className="border-b border-border/60 last:border-0">
                      {item.href ? (
                        <Link
                          href={item.href}
                          onClick={() => void onItemClick(item)}
                          className={cn(
                            "block px-4 py-3 transition-colors hover:bg-secondary/40",
                            !item.readAt && "bg-primary/5",
                          )}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void onItemClick(item)}
                          className={cn(
                            "block w-full px-4 py-3 text-left transition-colors hover:bg-secondary/40",
                            !item.readAt && "bg-primary/5",
                          )}
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
