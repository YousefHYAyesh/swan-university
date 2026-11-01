"use client";

import { useActionState, useMemo, useState } from "react";
import { SubmitButton } from "@/components/forms";
import { GradeChip, Notice } from "@/components/ui";
import {
  currentPercent,
  finalResult,
  letterFor,
  type AssessmentInput,
  type ScaleEntry,
} from "@/domain/grading";
import { saveScores } from "@/server/professor-actions";

interface Row {
  enrollmentId: number;
  name: string;
  studentNo: string;
  scores: Record<number, number | null>;
}

export function Gradebook({
  sectionId,
  assessments,
  rows,
  scale,
  editable,
}: {
  sectionId: number;
  assessments: (AssessmentInput & { name: string })[];
  rows: Row[];
  scale: ScaleEntry[];
  editable: boolean;
}) {
  const [state, action] = useActionState(saveScores, null);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const r of rows)
      for (const a of assessments)
        v[`s-${r.enrollmentId}-${a.id}`] = r.scores[a.id]?.toString() ?? "";
    return v;
  });
  const [dirty, setDirty] = useState(false);
  const weightsOk =
    Math.round(assessments.reduce((s, a) => s + a.weight, 0) * 100) / 100 ===
    100;

  const computed = useMemo(() => {
    return rows.map((r) => {
      const map = new Map<number, number | null>();
      for (const a of assessments) {
        const raw = values[`s-${r.enrollmentId}-${a.id}`];
        const n =
          raw === "" || raw == null ? null : Number(raw.replace(",", "."));
        map.set(a.id, n != null && Number.isFinite(n) ? n : null);
      }
      const running = currentPercent(assessments, map);
      const projected = weightsOk ? finalResult(assessments, map, scale) : null;
      return { running, projected };
    });
  }, [rows, assessments, values, scale, weightsOk]);

  const errors = state?.fieldErrors ?? {};
  // The projected letter only means something once final exam scores start coming in.
  const finalId = assessments.find((a) => a.type === "FINAL")?.id;
  const showResult =
    weightsOk &&
    (finalId == null ||
      rows.some(
        (r) => (values[`s-${r.enrollmentId}-${finalId}`] ?? "") !== "",
      ));

  return (
    <form action={action} onSubmit={() => setDirty(false)}>
      <input type="hidden" name="sectionId" value={sectionId} />
      {(state?.error || state?.ok) && (
        <div className="px-5 pt-4">
          <Notice tone={state.error ? "danger" : "ok"}>
            {state.error ?? state.ok}
          </Notice>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-[1] border-b border-line bg-paper px-4 py-2.5 text-left font-medium text-muted">
                Student
              </th>
              {assessments.map((a) => (
                <th
                  key={a.id}
                  className="border-b border-line bg-paper px-2 py-2.5 text-right font-medium text-muted"
                >
                  <div className="text-ink">{a.name}</div>
                  <div className="text-xs font-normal">
                    {a.weight}% · /{a.maxScore}
                  </div>
                </th>
              ))}
              <th className="border-b border-line bg-paper px-4 py-2.5 text-right font-medium text-muted">
                So far
              </th>
              {showResult && (
                <th
                  className="border-b border-line bg-paper px-4 py-2.5 text-right font-medium text-muted"
                  title="Letter the student gets if submitted now"
                >
                  Course result
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const c = computed[i];
              return (
                <tr key={r.enrollmentId} className="hover:bg-paper/60">
                  <td className="sticky left-0 border-b border-line/70 bg-white px-4 py-1.5">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted">{r.studentNo}</div>
                  </td>
                  {assessments.map((a) => {
                    const key = `s-${r.enrollmentId}-${a.id}`;
                    return (
                      <td
                        key={a.id}
                        className="border-b border-line/70 px-2 py-1.5 text-right"
                      >
                        <input
                          name={key}
                          inputMode="decimal"
                          aria-label={`${a.name} for ${r.name}`}
                          title={errors[key]}
                          disabled={!editable}
                          value={values[key]}
                          onChange={(e) => {
                            setDirty(true);
                            setValues((v) => ({ ...v, [key]: e.target.value }));
                          }}
                          className={`h-8 w-16 rounded-[var(--radius-control)] border px-2 text-right focus:border-lake focus:outline-none focus:ring-2 focus:ring-lake/20 disabled:border-transparent disabled:bg-transparent ${
                            errors[key]
                              ? "border-danger bg-danger-wash"
                              : "border-line"
                          }`}
                        />
                      </td>
                    );
                  })}
                  <td className="border-b border-line/70 px-4 py-1.5 text-right whitespace-nowrap">
                    {c.running.percent == null ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        {c.running.percent.toFixed(1)}%
                        <GradeChip
                          size="sm"
                          letter={letterFor(c.running.percent, scale)}
                        />
                      </span>
                    )}
                  </td>
                  {showResult && (
                    <td className="border-b border-line/70 px-4 py-1.5 text-right whitespace-nowrap">
                      {c.projected ? (
                        <span className="inline-flex items-center gap-2 text-ink-soft">
                          {c.projected.percent.toFixed(1)}%
                          <GradeChip size="sm" letter={c.projected.letter} />
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editable && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
          <span className="text-sm text-muted">
            {dirty
              ? "You have unsaved changes."
              : "Blank cells mean not graded yet. A blank final exam becomes NA on submission."}
          </span>
          <SubmitButton pendingText="Saving…">Save scores</SubmitButton>
        </div>
      )}
    </form>
  );
}
