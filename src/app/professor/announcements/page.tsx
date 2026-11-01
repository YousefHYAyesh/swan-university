import { desc, eq } from "drizzle-orm";
import { InlineAction } from "@/components/forms";
import { Badge, Empty, PageHeader, Panel } from "@/components/ui";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { getCurrentTerm } from "@/server/academic";
import { deleteOwnAnnouncement } from "@/server/professor-actions";
import { sectionsTaughtBy } from "@/server/professor";
import { SectionAnnouncementForm } from "./announcement-form";

export const metadata = { title: "Announcements" };

export default async function ProfessorAnnouncements() {
  const user = await requireRole("PROFESSOR");
  const [term, sections, mine] = await Promise.all([
    getCurrentTerm(),
    sectionsTaughtBy(user.id),
    db.query.announcements.findMany({
      where: eq(announcements.authorId, user.id),
      with: { section: { with: { course: true } } },
      orderBy: [desc(announcements.createdAt)],
    }),
  ]);
  const options = sections
    .filter((s) => s.termId === term?.id)
    .map((s) => ({ id: s.id, label: `${s.course.code} ${s.course.title} · ${s.code}` }));
  return (
    <>
      <PageHeader title="Announcements" description="Post updates to the students in your sections." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Panel title="Posted by you" flush>
          {mine.length === 0 ? (
            <Empty title="Nothing posted yet" />
          ) : (
            <ul className="divide-y divide-line">
              {mine.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.title}</span>
                      {a.section && <Badge tone="lake">{a.section.course.code}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{a.body}</p>
                    <p className="mt-1 text-xs text-muted">{formatDate(a.createdAt)}</p>
                  </div>
                  <InlineAction action={deleteOwnAnnouncement} label="Delete" variant="ghost" hidden={{ announcementId: a.id }} confirm="Delete this announcement?" />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="New announcement">
          {options.length ? <SectionAnnouncementForm sections={options} /> : <Empty title="No sections this term" />}
        </Panel>
      </div>
    </>
  );
}
