import { Bell } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { markAllRead, openNotification } from "@/server/notification-actions";
import { recentNotifications, unreadCount } from "@/server/notifications";

export async function NotificationBell({ user }: { user: SessionUser }) {
  const [count, items] = await Promise.all([unreadCount(user.id), recentNotifications(user.id, 8)]);
  return (
    <details className="relative">
      <summary
        className="relative flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-ink-soft hover:bg-paper hover:text-ink"
        aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </summary>
      <div className="absolute right-0 top-11 z-30 w-[22rem] overflow-hidden rounded-[var(--radius-panel)] border border-line bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="font-semibold">Notifications</span>
          {count > 0 && (
            <form action={markAllRead}>
              <button className="text-sm text-lake hover:underline">Mark all as read</button>
            </form>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">You’re all caught up.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-line overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <form action={openNotification}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className={`block w-full px-4 py-3 text-left hover:bg-paper ${n.readAt ? "" : "bg-lake-wash/50"}`}>
                    <span className="flex items-start gap-2">
                      {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lake" aria-label="Unread" />}
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{n.title}</span>
                        {n.body && <span className="block truncate text-sm text-ink-soft">{n.body}</span>}
                        <span className="block text-xs text-muted">{formatDate(n.createdAt)}</span>
                      </span>
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
