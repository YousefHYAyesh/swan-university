import { desc } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { AnnouncementComposer, DeleteAnnouncement } from "./announcement-composer";
import { Badge, Empty, PageHeader, Panel } from "./ui";

const AUDIENCE: Record<string, string> = { ALL: "Everyone", STUDENTS: "Students", STAFF: "Staff", SECTION: "Section" };

/** University-wide announcements, shared by the registrar and admin areas. */
export async function AnnouncementManager({ user }: { user: SessionUser }) {
  const rows = await db.query.announcements.findMany({
    with: { author: true, section: { with: { course: true } } },
    orderBy: [desc(announcements.createdAt)],
    limit: 50,
  });
  return (
    <>
      <PageHeader title="Announcements" description="Post to everyone, all students or all staff. Instructors post to their own sections." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Panel title="Recent" flush>
          {rows.length === 0 ? (
            <Empty title="No announcements" />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.title}</span>
                      <Badge tone="lake">{a.section ? a.section.course.code : AUDIENCE[a.audience]}</Badge>
                      {a.pinned && <Badge tone="amber">Pinned</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{a.body}</p>
                    <p className="mt-1 text-xs text-muted">
                      {a.author.firstName} {a.author.lastName}, {formatDate(a.createdAt)}
                    </p>
                  </div>
                  {(user.role === "ADMIN" || a.authorId === user.id) && <DeleteAnnouncement id={a.id} />}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="New announcement">
          <AnnouncementComposer />
        </Panel>
      </div>
    </>
  );
}
