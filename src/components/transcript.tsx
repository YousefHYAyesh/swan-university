import type { AcademicSummary, StudentWithUser } from "@/server/records";
import { formatDate, termLabel } from "@/lib/utils";
import { STANDING_LABEL } from "@/server/records";

/** Official-style transcript. Only approved grades are listed. */
export function Transcript({
  student,
  summary,
  universityName,
  scalePoints,
}: {
  student: StudentWithUser;
  summary: AcademicSummary;
  universityName: string;
  scalePoints: Map<string, number | null>;
}) {
  const terms = [...summary.terms].reverse().filter((t) => t.graded);
  return (
    <article className="rounded-[var(--radius-panel)] border border-line bg-white p-8 print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-ink pb-5">
        <div>
          <p className="text-sm text-muted">{universityName} · Office of the Registrar</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Academic transcript</h2>
          <p className="mt-1 text-sm text-ink-soft">Issued {formatDate(new Date())}</p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">Name</dt>
          <dd className="font-medium">
            {student.user.firstName} {student.user.lastName}
          </dd>
          <dt className="text-muted">Student no.</dt>
          <dd>{student.studentNo}</dd>
          <dt className="text-muted">Program</dt>
          <dd>
            {student.program.degree} {student.program.name}
          </dd>
          <dt className="text-muted">Entry year</dt>
          <dd>{student.entryYear}</dd>
        </dl>
      </header>

      {terms.length === 0 ? (
        <p className="py-10 text-center text-muted">No final grades have been recorded yet.</p>
      ) : (
        terms.map((t) => (
          <section key={t.term.id} className="mt-6 break-inside-avoid">
            <h3 className="mb-2 font-semibold">{termLabel(t.term)}</h3>
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr className="border-b border-line">
                  <th className="py-1.5 pr-3 font-medium">Code</th>
                  <th className="py-1.5 pr-3 font-medium">Course</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Credits</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Grade</th>
                  <th className="py-1.5 text-right font-medium">Points</th>
                </tr>
              </thead>
              <tbody>
                {t.rows
                  .filter((r) => r.section.gradeStatus === "APPROVED" && r.letterGrade)
                  .map((r) => {
                    const pts = scalePoints.get(r.letterGrade!);
                    return (
                      <tr key={r.id} className="border-b border-line/60">
                        <td className="py-1.5 pr-3">{r.section.course.code}</td>
                        <td className="py-1.5 pr-3">{r.section.course.title}</td>
                        <td className="py-1.5 pr-3 text-right">{r.section.course.credits}</td>
                        <td className="py-1.5 pr-3 text-right font-medium">{r.letterGrade}</td>
                        <td className="py-1.5 text-right">{pts == null ? "—" : (pts * r.section.course.credits).toFixed(2)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            <p className="mt-2 text-right text-sm text-ink-soft">
              Term GPA {t.gpa?.toFixed(2) ?? "—"} · credits {t.credits} · cumulative GPA {t.cgpa?.toFixed(2) ?? "—"}
            </p>
          </section>
        ))
      )}

      <footer className="mt-8 grid gap-4 border-t-2 border-ink pt-4 text-sm sm:grid-cols-4">
        <div>
          <div className="text-muted">Cumulative GPA</div>
          <div className="text-lg font-semibold">{summary.cgpa?.toFixed(2) ?? "—"}</div>
        </div>
        <div>
          <div className="text-muted">Credits attempted</div>
          <div className="text-lg font-semibold">{summary.attemptedCredits}</div>
        </div>
        <div>
          <div className="text-muted">Credits earned</div>
          <div className="text-lg font-semibold">{summary.earnedCredits}</div>
        </div>
        <div>
          <div className="text-muted">Standing</div>
          <div className="text-lg font-semibold">{STANDING_LABEL[summary.standing].label}</div>
        </div>
      </footer>
      <p className="mt-6 text-xs text-muted">
        Grades on the AA–FF scale (AA = 4.00 … FF = 0.00). Repeated courses count once in the cumulative GPA, using the latest attempt.
      </p>
    </article>
  );
}
