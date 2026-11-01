import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { Badge, Empty, PageHeader, Panel, Stat, Table, Td } from "@/components/ui";
import { db } from "@/db";
import { studentRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { REQUEST_STATUS, REQUEST_TYPE } from "@/lib/labels";
import { formatDate, termLabel } from "@/lib/utils";
import { getCurrentTerm } from "@/server/academic";
import { registrarCounts, sectionsAwaitingReview } from "@/server/registrar";

export const metadata = { title: "Registrar" };

export default async function RegistrarHome() {
  const user = await requireRole("REGISTRAR");
  const term = await getCurrentTerm();
  const [counts, review, requests] = await Promise.all([
    registrarCounts(term?.id ?? null),
    sectionsAwaitingReview(),
    db.query.studentRequests.findMany({
      where: inArray(studentRequests.status, ["PENDING", "IN_PROGRESS"]),
      with: { student: { with: { user: true } } },
      orderBy: [desc(studentRequests.createdAt)],
      limit: 6,
    }),
  ]);
  return (
    <>
      <PageHeader
        title={`Good to see you, ${user.firstName}`}
        description={term ? `${termLabel(term)} · add/drop closes ${formatDate(term.registrationClosesOn)} · grades due ${formatDate(term.gradeDeadline)}` : undefined}
      />
      <Panel className="mb-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat label="Grades to review" value={counts.pendingGrades} />
          <Stat label="Open requests" value={counts.openRequests} />
          <Stat label="Active holds" value={counts.activeHolds} />
          <Stat label="Sections not submitted" value={counts.draftSections} note="this term" />
        </div>
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Waiting for grade approval" actions={<Link href="/registrar/grades" className="text-sm text-lake hover:underline">All</Link>} flush>
          {review.length === 0 ? (
            <Empty title="Nothing to review" />
          ) : (
            <Table>
              <tbody>
                {review.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <Link href={`/registrar/grades/${s.id}`} className="font-medium hover:text-lake">
                        {s.course.code} {s.course.title} · {s.code}
                      </Link>
                      <div className="text-muted">
                        {s.instructor?.user.firstName} {s.instructor?.user.lastName} · {s.enrollments.length} students
                      </div>
                    </Td>
                    <Td className="text-right text-ink-soft">{formatDate(s.gradesSubmittedAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        <Panel title="Open requests" actions={<Link href="/registrar/requests" className="text-sm text-lake hover:underline">All</Link>} flush>
          {requests.length === 0 ? (
            <Empty title="No open requests" />
          ) : (
            <Table>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <div className="font-medium">{REQUEST_TYPE[r.type]}</div>
                      <Link href={`/registrar/students/${r.studentId}`} className="text-muted hover:text-lake">
                        {r.student.user.firstName} {r.student.user.lastName}
                      </Link>
                    </Td>
                    <Td className="text-right">
                      <Badge tone={REQUEST_STATUS[r.status].tone}>{REQUEST_STATUS[r.status].label}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
