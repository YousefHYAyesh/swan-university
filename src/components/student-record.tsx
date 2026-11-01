import type { DegreeAudit } from "@/domain/degree-audit";
import { DegreeProgress } from "./degree-progress";
import { Badge, DescList, GradeChip, Notice, Panel, Stat, Table, Td, Th } from "./ui";
import { formatDate, termLabel } from "@/lib/utils";
import { STANDING_LABEL, type AcademicSummary, type StudentWithUser } from "@/server/records";

/** Read-only academic record used by advisors and the registrar. */
export function StudentRecord({
  student,
  summary,
  holds,
  degree,
}: {
  student: StudentWithUser;
  summary: AcademicSummary;
  holds: { id: number; type: string; reason: string; createdAt: Date }[];
  degree?: DegreeAudit | null;
}) {
  const standing = STANDING_LABEL[summary.standing];
  return (
    <div className="space-y-6">
      {holds.length > 0 && (
        <Notice tone="danger">
          {holds.map((h) => (
            <div key={h.id}>
              <strong>{h.type === "REGISTRATION" ? "Registration hold" : "Transcript hold"}</strong> since {formatDate(h.createdAt)}: {h.reason}
            </div>
          ))}
        </Notice>
      )}
      <Panel>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat label="Cumulative GPA" value={summary.cgpa?.toFixed(2) ?? "—"} />
          <Stat label="Standing" value={<Badge tone={standing.tone}>{standing.label}</Badge>} />
          <Stat label="Credits earned" value={summary.earnedCredits} note={`${summary.attemptedCredits} attempted`} />
          <Stat label="Status" value={<Badge tone={student.status === "ACTIVE" ? "ok" : "amber"}>{student.status.toLowerCase()}</Badge>} />
        </div>
      </Panel>
      {degree && (
        <details className="group rounded-[var(--radius-panel)] border border-line bg-white">
          <summary className="cursor-pointer list-none px-5 py-3 font-semibold">
            Degree progress <span className="font-normal text-muted">· {degree.percentComplete}% of credits, {degree.coreDone}/{degree.core.length} required courses</span>
          </summary>
          <div className="border-t border-line p-5">
            <DegreeProgress audit={degree} programName={student.program.name} />
          </div>
        </details>
      )}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Panel title="Details">
          <DescList
            items={[
              ["Student no.", student.studentNo],
              ["Email", student.user.email],
              ["Program", `${student.program.degree} ${student.program.name}`],
              ["Entry year", student.entryYear],
              ["Phone", student.phone],
              ["Advisor", student.advisor ? `${student.advisor.user.firstName} ${student.advisor.user.lastName}` : "Not assigned"],
              ["Guardian", student.guardianName ? `${student.guardianName}, ${student.guardianPhone ?? ""}` : null],
            ]}
          />
        </Panel>
        <div className="space-y-6">
          {summary.terms.map((t) => (
            <Panel
              key={t.term.id}
              title={termLabel(t.term)}
              actions={t.graded && <span className="text-sm text-ink-soft">GPA {t.gpa?.toFixed(2)} · CGPA {t.cgpa?.toFixed(2)}</span>}
              flush
            >
              <Table>
                <thead>
                  <tr>
                    <Th>Course</Th>
                    <Th className="text-right">Credits</Th>
                    <Th className="text-right">Percent</Th>
                    <Th className="text-right">Grade</Th>
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r) => {
                    const final = r.section.gradeStatus === "APPROVED";
                    return (
                      <tr key={r.id}>
                        <Td>
                          <span className="font-medium">{r.section.course.code}</span> {r.section.course.title}
                          {r.status !== "REGISTERED" && <span className="ml-2 text-muted">({r.status.toLowerCase()})</span>}
                        </Td>
                        <Td className="text-right">{r.section.course.credits}</Td>
                        <Td className="text-right text-ink-soft">
                          {final ? `${r.finalPercent?.toFixed(1)}%` : r.runningPercent != null ? `${r.runningPercent.toFixed(1)}% so far` : "—"}
                        </Td>
                        <Td className="text-right">{final ? <GradeChip size="sm" letter={r.letterGrade} /> : <span className="text-muted">in progress</span>}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
