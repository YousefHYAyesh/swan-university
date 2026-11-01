"use client";

import { ActionForm, InlineAction, SubmitButton } from "@/components/forms";
import { Field, Input, Select } from "@/components/ui";
import { ASSESSMENT_TYPE } from "@/lib/labels";
import { deleteAssessment, saveAssessment, saveAttendance, submitGrades } from "@/server/professor-actions";

type Assessment = { id: number; name: string; type: string; weight: number; maxScore: number; dueOn: string | null };

export function AssessmentForm({ sectionId, assessment }: { sectionId: number; assessment?: Assessment }) {
  return (
    <ActionForm action={saveAssessment} resetOnSuccess={!assessment}>
      {(e) => (
        <div className="grid items-end gap-3 sm:grid-cols-[2fr_1.4fr_0.8fr_0.8fr_1.2fr_auto]">
          <input type="hidden" name="sectionId" value={sectionId} />
          {assessment && <input type="hidden" name="assessmentId" value={assessment.id} />}
          <Field label="Name" error={e.name}>
            <Input name="name" defaultValue={assessment?.name} required placeholder="e.g. Quiz 2" />
          </Field>
          <Field label="Type" error={e.type}>
            <Select name="type" defaultValue={assessment?.type ?? "QUIZ"}>
              {Object.entries(ASSESSMENT_TYPE).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Weight %" error={e.weight}>
            <Input name="weight" inputMode="decimal" defaultValue={assessment?.weight} required />
          </Field>
          <Field label="Out of" error={e.maxScore}>
            <Input name="maxScore" inputMode="decimal" defaultValue={assessment?.maxScore ?? 100} required />
          </Field>
          <Field label="Due" error={e.dueOn}>
            <Input name="dueOn" type="date" defaultValue={assessment?.dueOn ?? ""} />
          </Field>
          <SubmitButton variant={assessment ? "secondary" : "primary"}>{assessment ? "Save" : "Add"}</SubmitButton>
        </div>
      )}
    </ActionForm>
  );
}

export function DeleteAssessment({ sectionId, assessment }: { sectionId: number; assessment: Assessment }) {
  return (
    <InlineAction
      action={deleteAssessment}
      label="Remove"
      variant="ghost"
      hidden={{ sectionId, assessmentId: assessment.id }}
      confirm={`Remove "${assessment.name}"? Any scores entered for it will be deleted.`}
    />
  );
}

export function SubmitGradesForm({ sectionId, missingFinals }: { sectionId: number; missingFinals: number }) {
  return (
    <ActionForm action={submitGrades} className="space-y-3">
      <input type="hidden" name="sectionId" value={sectionId} />
      {missingFinals > 0 && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="confirmNa" value="yes" className="mt-0.5 h-4 w-4 accent-lake" />
          {missingFinals} student{missingFinals === 1 ? " has" : "s have"} no final exam score. Submit them as NA (did not sit the final).
        </label>
      )}
      <SubmitButton confirm="Submit grades to the registrar? You won't be able to edit them unless they're returned.">Submit grades</SubmitButton>
    </ActionForm>
  );
}

export function AttendanceForm({
  sectionId,
  date,
  topic,
  roster,
}: {
  sectionId: number;
  date: string;
  topic: string;
  roster: { enrollmentId: number; name: string; studentNo: string; status: string }[];
}) {
  const options = [
    ["PRESENT", "Present"],
    ["LATE", "Late"],
    ["ABSENT", "Absent"],
    ["EXCUSED", "Excused"],
  ];
  return (
    <ActionForm action={saveAttendance} key={date}>
      <input type="hidden" name="sectionId" value={sectionId} />
      <div className="mb-4 grid gap-3 sm:grid-cols-[180px_1fr]">
        <Field label="Date">
          <Input name="heldOn" type="date" defaultValue={date} required />
        </Field>
        <Field label="Topic">
          <Input name="topic" defaultValue={topic} placeholder="What was covered" />
        </Field>
      </div>
      <div className="divide-y divide-line rounded-[var(--radius-control)] border border-line">
        {roster.map((r) => (
          <fieldset key={r.enrollmentId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <legend className="sr-only">{r.name}</legend>
            <span className="text-sm">
              <span className="font-medium">{r.name}</span> <span className="text-muted">{r.studentNo}</span>
            </span>
            <span className="flex gap-1">
              {options.map(([value, label]) => (
                <label key={value} className="cursor-pointer">
                  <input type="radio" name={`a-${r.enrollmentId}`} value={value} defaultChecked={r.status === value} className="peer sr-only" />
                  <span className="inline-block rounded-[var(--radius-control)] border border-line px-2.5 py-1 text-xs peer-checked:border-lake peer-checked:bg-lake peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-lake/40">
                    {label}
                  </span>
                </label>
              ))}
            </span>
          </fieldset>
        ))}
      </div>
      <div className="mt-4">
        <SubmitButton>Save attendance</SubmitButton>
      </div>
    </ActionForm>
  );
}
