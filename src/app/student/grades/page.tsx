import { TargetPlanner } from "@/components/target-planner";
import { Badge, Empty, GradeChip, PageHeader, Panel, Table, Td, Th } from "@/components/ui";
import { letterFor } from "@/domain/grading";
import { requireRole } from "@/lib/auth/session";
import { termLabel } from "@/lib/utils";
import { getScale } from "@/server/academic";
import { academicSummary } from "@/server/records";

export const metadata = { title: "Grades" };

const STATUS: Record<string, { label: string; tone: "neutral" | "amber" | "ok" | "lake" }> = {
  DRAFT: { label: "In progress", tone: "neutral" },
  RETURNED: { label: "In progress", tone: "neutral" },
  SUBMITTED: { label: "Awaiting registrar approval", tone: "amber" },
  APPROVED: { label: "Final", tone: "ok" },
};

export default async function GradesPage() {
  const user = await requireRole("STUDENT");
  const [summary, scale] = await Promise.all([academicSummary(user.id), getScale()]);
  const bands = scale
    .filter((g): g is typeof g & { minPercent: number } => g.minPercent != null && g.isPassing)
    .map((g) => ({ letter: g.letter, minPercent: g.minPercent }));

  return (
    <>
      <PageHeader title="Grades" description="Assessment scores for every course, with your running percentage while a course is in progress." />
      {summary.terms.length === 0 && <Empty title="No courses yet" />}
      <div className="space-y-10">
        {summary.terms.map((t) => (
          <section key={t.term.id}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">{termLabel(t.term)}</h2>
              {t.graded && (
                <p className="text-sm text-ink-soft">
                  Term GPA <strong className="text-ink">{t.gpa?.toFixed(2)}</strong> · cumulative{" "}
                  <strong className="text-ink">{t.cgpa?.toFixed(2)}</strong>
                </p>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {t.rows.map((r) => {
                const scores = new Map(r.scores.map((s) => [s.assessmentId, s.score]));
                const final = r.section.gradeStatus === "APPROVED";
                const status = STATUS[r.section.gradeStatus];
                const earned = r.section.assessments.reduce((sum, a) => {
                  const s = scores.get(a.id);
                  return s == null ? sum : sum + (s / a.maxScore) * a.weight;
                }, 0);
                const remaining = 100 - r.weightCovered;
                return (
                  <Panel
                    key={r.id}
                    title={
                      <span id={r.section.course.code}>
                        {r.section.course.code} {r.section.course.title}
                      </span>
                    }
                    actions={
                      final ? (
                        <GradeChip letter={r.status === "WITHDRAWN" ? "W" : r.letterGrade} />
                      ) : (
                        <Badge tone={status.tone}>{status.label}</Badge>
                      )
                    }
                    flush
                  >
                    <Table>
                      <thead>
                        <tr>
                          <Th>Assessment</Th>
                          <Th className="text-right">Weight</Th>
                          <Th className="text-right">Score</Th>
                          <Th className="text-right">%</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.section.assessments.map((a) => {
                          const s = scores.get(a.id);
                          return (
                            <tr key={a.id}>
                              <Td>{a.name}</Td>
                              <Td className="text-right text-ink-soft">{a.weight}%</Td>
                              <Td className="text-right">{s == null ? <span className="text-muted">—</span> : `${s} / ${a.maxScore}`}</Td>
                              <Td className="text-right">{s == null ? "" : `${((s / a.maxScore) * 100).toFixed(0)}%`}</Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                    <div className="space-y-3 px-5 py-4 text-sm">
                      {final ? (
                        <p>
                          Final result <strong>{r.finalPercent?.toFixed(2)}%</strong> · {r.section.course.credits} credits
                        </p>
                      ) : r.runningPercent == null ? (
                        <p className="text-muted">Nothing graded yet.</p>
                      ) : (
                        <>
                          <p className="flex items-center gap-2">
                            Running average <strong>{r.runningPercent.toFixed(1)}%</strong>
                            <GradeChip size="sm" letter={letterFor(r.runningPercent, scale)} />
                            <span className="text-muted">over the {r.weightCovered}% graded so far</span>
                          </p>
                          <TargetPlanner earned={earned} remainingWeight={remaining} bands={bands} />
                        </>
                      )}
                    </div>
                  </Panel>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
