"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Check, Trash2, X, Loader2, Briefcase, Mail, FileText, MessageSquare, Bell as BellFallback } from "lucide-react";
import { BellIcon, type BellIconHandle } from "@/components/icons/bell";
import { cn } from "@/lib/utils";

type NotificationType = "system" | "job" | "response" | "resume" | "email";

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
  system: BellFallback,
  job: Briefcase,
  response: MessageSquare,
  resume: FileText,
  email: Mail,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  system: "text-muted-foreground",
  job: "text-blue-500",
  response: "text-emerald-500",
  resume: "text-purple-500",
  email: "text-amber-500",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef<BellIconHandle>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setItems(data.notifications ?? []);
        setUnread(data.unreadCount ?? 0);
      }
    } catch {
      /* non-blocking */
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + poll every 60s for new notifications.
  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAllRead() {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await fetch("/api/notifications", { method: "PATCH" }).catch(() => load());
  }

  async function markRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnread((u) => Math.max(0, u - 1));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() =>
      load()
    );
  }

  async function remove(id: string) {
    const wasUnread = items.find((n) => n.id === id && !n.isRead);
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnread((u) => Math.max(0, u - 1));
    await fetch(`/api/notifications/${id}`, { method: "DELETE" }).catch(() =>
      load()
    );
  }

  async function clearAll() {
    setItems([]);
    setUnread(0);
    await fetch("/api/notifications", { method: "DELETE" }).catch(() => load());
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        onMouseEnter={() => bellRef.current?.startAnimation?.()}
        onMouseLeave={() => bellRef.current?.stopAnimation?.()}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <BellIcon ref={bellRef} className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm origin-top-right rounded-xl border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {unread} new
                </span>
              )}
            </div>
            {items.length > 0 && (
              <button
                onClick={markAllRead}
                disabled={unread === 0}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                <BellFallback className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">You're all caught up</p>
                <p className="text-xs text-muted-foreground">
                  Job results, responses and updates will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? BellFallback;
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "group flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                        !n.isRead && "bg-primary/5"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted",
                          TYPE_COLOR[n.type]
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        {n.link ? (
                          <a
                            href={n.link}
                            onClick={() => {
                              if (!n.isRead) markRead(n.id);
                              setOpen(false);
                            }}
                            className="block"
                          >
                            <p className="truncate text-sm font-medium">
                              {n.title}
                            </p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {n.message}
                            </p>
                          </a>
                        ) : (
                          <>
                            <p className="truncate text-sm font-medium">
                              {n.title}
                            </p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {n.message}
                            </p>
                          </>
                        )}
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-start gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {!n.isRead && (
                          <button
                            onClick={() => markRead(n.id)}
                            title="Mark as read"
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => remove(n.id)}
                          title="Delete"
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-border px-4 py-2">
              <button
                onClick={clearAll}
                className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
