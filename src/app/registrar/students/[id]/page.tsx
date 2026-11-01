import { notFound } from "next/navigation";
import { StudentRecord } from "@/components/student-record";
import { ButtonLink, Empty, Notice, PageHeader, Panel, Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getCurrentTerm } from "@/server/academic";
import { getDegreeAudit } from "@/server/degree";
import { academicSummary, activeHolds, getStudent } from "@/server/records";
import { HoldForm, ReleaseHold, WithdrawButton } from "./student-actions";

export default async function RegistrarStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireRole("REGISTRAR");
  const id = Number((await params).id);
  const { created } = await searchParams;
  const [student, summary, holds, term] = await Promise.all([getStudent(id), academicSummary(id), activeHolds(id), getCurrentTerm()]);
  if (!student) notFound();
  const degree = await getDegreeAudit(id, student.programId);
  const current = summary.terms.find((t) => t.term.id === term?.id)?.rows.filter((r) => r.status === "REGISTERED") ?? [];

  return (
    <>
      <PageHeader
        back={{ href: "/registrar/students", label: "Students" }}
        title={`${student.user.firstName} ${student.user.lastName}`}
        description={`${student.studentNo} · ${student.program.degree} ${student.program.name}`}
        actions={
          <>
            <ButtonLink variant="secondary" href={`/registrar/students/${id}/transcript`}>
              Transcript
            </ButtonLink>
            <ButtonLink variant="secondary" href={`/registrar/students/${id}/edit`}>
              Edit record
            </ButtonLink>
          </>
        }
      />
      {created && (
        <div className="mb-6">
          <Notice tone="ok">
            Student created. Temporary password: <code className="font-semibold">{created}</code>. Share it securely; it won’t be shown again.
          </Notice>
        </div>
      )}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Current courses" flush>
          {current.length === 0 ? (
            <Empty title="Not registered for any courses this term" />
          ) : (
            <Table>
              <tbody>
                {current.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <span className="font-medium">{r.section.course.code}</span> {r.section.course.title}
                    </Td>
                    <Td className="text-right">
                      {r.section.gradeStatus !== "APPROVED" && <WithdrawButton enrollmentId={r.id} code={r.section.course.code} />}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        <Panel title="Holds">
          {holds.length > 0 && (
            <ul className="mb-4 divide-y divide-line rounded-[var(--radius-control)] border border-line">
              {holds.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium">{h.type === "REGISTRATION" ? "Registration" : "Transcript"}</span>: {h.reason}
                  </span>
                  <ReleaseHold holdId={h.id} />
                </li>
              ))}
            </ul>
          )}
          <HoldForm studentId={id} />
        </Panel>
      </div>
      <StudentRecord student={student} summary={summary} holds={[]} degree={degree?.audit} />
    </>
  );
}
