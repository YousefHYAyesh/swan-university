import type { AnnouncementItem } from "@/server/announcements";
import { formatDate } from "@/lib/utils";
import { Badge, Empty } from "./ui";

export function AnnouncementList({ items }: { items: AnnouncementItem[] }) {
  if (!items.length) return <Empty title="No announcements">New announcements from your instructors and the university show up here.</Empty>;
  return (
    <ul className="divide-y divide-line">
      {items.map((a) => (
        <li key={a.id} className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{a.title}</h3>
            {a.pinned && <Badge tone="amber">Pinned</Badge>}
            {a.courseCode && <Badge tone="lake">{a.courseCode}</Badge>}
          </div>
          <p className="mt-1 max-w-[75ch] text-sm text-ink-soft">{a.body}</p>
          <p className="mt-1.5 text-xs text-muted">
            {a.authorFirst} {a.authorLast}, {formatDate(a.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
