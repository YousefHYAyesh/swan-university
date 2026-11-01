import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge, GradeChip, PageHeader, Panel, Stat, Table, Td, Th } from "@/components/ui";
import { GRADE_COLORS } from "@/lib/grade-colors";
import { db } from "@/db";
import { enrollments, sections } from "@/db/schema";
import { finalResult } from "@/domain/grading";
import { requireRole } from "@/lib/auth/session";
import { GRADE_STATUS } from "@/lib/labels";
import { formatDate, termLabel } from "@/lib/utils";
import { getScale } from "@/server/academic";
import { ReviewForms } from "./review-forms";

export default async function ReviewSection({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("REGISTRAR");
  const id = Number((await params).id);
  const [section, scale] = await Promise.all([
    db.query.sections.findFirst({
      where: eq(sections.id, id),
      with: {
        course: true,
        term: true,
        instructor: { with: { user: true } },
        assessments: { orderBy: (a, { asc }) => [asc(a.position)] },
        enrollments: { where: eq(enrollments.status, "REGISTERED"), with: { scores: true, student: { with: { user: true } } } },
      },
    }),
    getScale(),
  ]);
  if (!section) notFound();

  const approved = section.gradeStatus === "APPROVED";
  const rows = section.enrollments
    .map((e) => {
      const map = new Map(e.scores.map((s) => [s.assessmentId, s.score]));
      const r = approved ? { percent: e.finalPercent ?? 0, letter: e.letterGrade ?? "" } : finalResult(section.assessments, map, scale);
      return { e, map, ...r };
    })
    .sort((a, b) => b.percent - a.percent);
  const passing = new Set(scale.filter((g) => g.isPassing).map((g) => g.letter));
  const passRate = rows.length ? Math.round((rows.filter((r) => passing.has(r.letter)).length / rows.length) * 100) : 0;
  const mean = rows.length ? rows.reduce((s, r) => s + r.percent, 0) / rows.length : 0;
  const na = rows.filter((r) => r.letter === "NA").length;
  const distribution = scale.filter((g) => g.letter !== "W").map((g) => ({ letter: g.letter, n: rows.filter((r) => r.letter === g.letter).length }));
  const max = Math.max(1, ...distribution.map((d) => d.n));

  return (
    <>
      <PageHeader
        back={{ href: "/registrar/grades", label: "Grade approvals" }}
        title={`${section.course.code} ${section.course.title} · ${section.code}`}
        description={`${termLabel(section.term)} · ${section.instructor?.title} ${section.instructor?.user.firstName} ${section.instructor?.user.lastName} · submitted ${formatDate(section.gradesSubmittedAt)}`}
        actions={<Badge tone={GRADE_STATUS[section.gradeStatus].tone}>{GRADE_STATUS[section.gradeStatus].label}</Badge>}
      />
      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Panel>
          <div className="grid grid-cols-2 gap-6">
            <Stat label="Students" value={rows.length} />
            <Stat label="Class average" value={`${mean.toFixed(1)}%`} />
            <Stat label="Pass rate" value={`${passRate}%`} />
            <Stat label="NA (missed final)" value={na} />
          </div>
        </Panel>
        <Panel title="Grade distribution">
          <div className="flex h-32 items-end gap-2" role="img" aria-label="Grade distribution">
            {distribution.map((d) => (
              <div key={d.letter} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-ink-soft">{d.n || ""}</span>
                <div className={`w-full rounded-t-[3px] ${GRADE_COLORS[d.letter] ?? "bg-line"}`} style={{ height: `${(d.n / max) * 88}px`, minHeight: d.n ? 3 : 0 }} />
                <span className="text-xs font-medium">{d.letter}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      {section.gradeStatus === "SUBMITTED" && (
        <Panel title="Decision" className="mb-6">
          <ReviewForms sectionId={section.id} />
        </Panel>
      )}
      <Panel title="Grades" flush>
        <Table>
          <thead>
            <tr>
              <Th>Student</Th>
              {section.assessments.map((a) => (
                <Th key={a.id} className="text-right">
                  {a.name}
                  <div className="text-xs font-normal">{a.weight}%</div>
                </Th>
              ))}
              <Th className="text-right">Final %</Th>
              <Th className="text-right">Letter</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, map, percent, letter }) => (
              <tr key={e.id}>
                <Td>
                  <div className="font-medium">
                    {e.student.user.lastName}, {e.student.user.firstName}
                  </div>
                  <div className="text-xs text-muted">{e.student.studentNo}</div>
                </Td>
                {section.assessments.map((a) => (
                  <Td key={a.id} className="text-right text-ink-soft">
                    {map.get(a.id) ?? <span className="text-danger">—</span>}
                    <span className="text-muted">/{a.maxScore}</span>
                  </Td>
                ))}
                <Td className="text-right font-medium">{percent.toFixed(2)}</Td>
                <Td className="text-right">
                  <GradeChip size="sm" letter={letter} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}
