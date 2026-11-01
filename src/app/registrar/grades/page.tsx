import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { Badge, Empty, Notice, PageHeader, Panel, Table, Td, Th } from "@/components/ui";
import { db } from "@/db";
import { sections } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { GRADE_STATUS } from "@/lib/labels";
import { formatDate, todayIso } from "@/lib/utils";
import { getCurrentTerm } from "@/server/academic";
import { sectionsAwaitingReview } from "@/server/registrar";

export const metadata = { title: "Grade approvals" };

export default async function GradeApprovals({ searchParams }: { searchParams: Promise<{ approved?: string; returned?: string }> }) {
  await requireRole("REGISTRAR");
  const sp = await searchParams;
  const doneId = Number(sp.approved ?? sp.returned) || null;
  const done = doneId ? await db.query.sections.findFirst({ where: eq(sections.id, doneId), with: { course: true, enrollments: { columns: { id: true } } } }) : null;
  const term = await getCurrentTerm();
  const [review, outstanding] = await Promise.all([
    sectionsAwaitingReview(),
    term
      ? db.query.sections.findMany({
          where: and(eq(sections.termId, term.id), inArray(sections.gradeStatus, ["DRAFT", "RETURNED"])),
          with: { course: true, instructor: { with: { user: true } } },
        })
      : [],
  ]);
  const late = term ? todayIso() > term.gradeDeadline : false;
  return (
    <>
      <PageHeader title="Grade approvals" description="Check each submitted section, then approve to make the grades final or return it to the instructor with a note." />
      {done && (
        <div className="mb-6">
          <Notice tone={sp.approved ? "ok" : "amber"}>
            {sp.approved
              ? `Approved grades for ${done.course.code} ${done.code}. ${done.enrollments.length} students were notified.`
              : `Returned ${done.course.code} ${done.code} to the instructor.`}
          </Notice>
        </div>
      )}
      <Panel title="Submitted" className="mb-6" flush>
        {review.length === 0 ? (
          <Empty title="Nothing waiting for approval" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Section</Th>
                <Th>Instructor</Th>
                <Th className="text-right">Students</Th>
                <Th className="text-right">Submitted</Th>
              </tr>
            </thead>
            <tbody>
              {review.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <Link href={`/registrar/grades/${s.id}`} className="font-medium text-lake hover:underline">
                      {s.course.code} {s.course.title} · {s.code}
                    </Link>
                  </Td>
                  <Td className="text-ink-soft">
                    {s.instructor?.user.firstName} {s.instructor?.user.lastName}
                  </Td>
                  <Td className="text-right">{s.enrollments.length}</Td>
                  <Td className="text-right">{formatDate(s.gradesSubmittedAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      <Panel
        title="Not yet submitted this term"
        actions={term && <span className={late ? "text-sm text-danger" : "text-sm text-ink-soft"}>Deadline {formatDate(term.gradeDeadline)}</span>}
        flush
      >
        {outstanding.length === 0 ? (
          <Empty title="Every section has submitted" />
        ) : (
          <Table>
            <tbody>
              {outstanding.map((s) => (
                <tr key={s.id}>
                  <Td>
                    {s.course.code} {s.course.title} · {s.code}
                  </Td>
                  <Td className="text-ink-soft">
                    {s.instructor?.user.firstName} {s.instructor?.user.lastName}
                  </Td>
                  <Td className="text-right">
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
