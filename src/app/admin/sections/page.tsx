import Link from "next/link";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Badge, ButtonLink, Empty, PageHeader, Panel, Select, Table, Td, Th, buttonClass } from "@/components/ui";
import { db } from "@/db";
import { enrollments, sections } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { GRADE_STATUS } from "@/lib/labels";
import { DAYS, hhmm } from "@/lib/utils";
import { getCurrentTerm } from "@/server/academic";
import { termOptions } from "@/server/admin";

export const metadata = { title: "Sections" };

export default async function SectionsPage({ searchParams }: { searchParams: Promise<{ term?: string }> }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const [current, termOpts] = await Promise.all([getCurrentTerm(), termOptions()]);
  const termId = Number(sp.term) || current?.id || termOpts[0]?.id;
  const rows = termId
    ? await db.query.sections.findMany({
        where: eq(sections.termId, termId),
        with: { course: true, meetings: true, instructor: { with: { user: true } } },
      })
    : [];
  const counts = rows.length
    ? await db
        .select({ sectionId: enrollments.sectionId, n: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(and(inArray(enrollments.sectionId, rows.map((r) => r.id)), eq(enrollments.status, "REGISTERED")))
        .groupBy(enrollments.sectionId)
    : [];
  const countBy = new Map(counts.map((c) => [c.sectionId, c.n]));
  rows.sort((a, b) => a.course.code.localeCompare(b.course.code) || a.code.localeCompare(b.code));
  return (
    <>
      <PageHeader title="Sections" description="Course offerings for a term: who teaches them, when, and how many seats." actions={<ButtonLink href={`/admin/sections/new?term=${termId}`}>Add section</ButtonLink>} />
      <Panel flush>
        <form className="flex gap-3 border-b border-line px-5 py-4">
          <Select name="term" defaultValue={termId} className="max-w-xs">
            {termOpts.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
          <button className={buttonClass("secondary")}>Show</button>
        </form>
        {rows.length === 0 ? (
          <Empty title="No sections in this term" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Section</Th>
                <Th>Instructor</Th>
                <Th>Meets</Th>
                <Th className="text-right">Enrolled</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <Link href={`/admin/sections/${s.id}`} className="font-medium hover:text-lake">
                      {s.course.code} · {s.code}
                    </Link>
                    <div className="text-muted">{s.course.title}</div>
                  </Td>
                  <Td className="text-ink-soft">{s.instructor ? `${s.instructor.user.firstName} ${s.instructor.user.lastName}` : "TBA"}</Td>
                  <Td className="whitespace-nowrap text-ink-soft">
                    {s.meetings.map((m) => `${DAYS[m.dayOfWeek]} ${hhmm(m.startsAt)}–${hhmm(m.endsAt)}`).join(", ") || "—"}
                    <div className="text-muted">{s.room}</div>
                  </Td>
                  <Td className="text-right">
                    {countBy.get(s.id) ?? 0}
                    <span className="text-muted"> / {s.capacity}</span>
                  </Td>
                  <Td className="space-x-1">
                    {s.status !== "OPEN" && <Badge tone="amber">{s.status.toLowerCase()}</Badge>}
                    <Badge tone={GRADE_STATUS[s.gradeStatus].tone}>{GRADE_STATUS[s.gradeStatus].label}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
