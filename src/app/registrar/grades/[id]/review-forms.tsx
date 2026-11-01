"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Textarea } from "@/components/ui";
import { approveGrades, returnGrades } from "@/server/registrar-actions";

export function ReviewForms({ sectionId }: { sectionId: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <ActionForm action={approveGrades} className="space-y-3">
        <input type="hidden" name="sectionId" value={sectionId} />
        <p className="text-sm text-ink-soft">Approving stores these letter grades permanently and counts them in each student’s GPA.</p>
        <SubmitButton confirm="Approve and finalise these grades?">Approve grades</SubmitButton>
      </ActionForm>
      <ActionForm action={returnGrades} className="space-y-3">
        {(e) => (
          <>
            <input type="hidden" name="sectionId" value={sectionId} />
            <Field label="Return to instructor" error={e.note}>
              <Textarea name="note" placeholder="What needs fixing" className="min-h-20" />
            </Field>
            <SubmitButton variant="secondary">Return with note</SubmitButton>
          </>
        )}
      </ActionForm>
    </div>
  );
}
