"use client";

import { ActionForm, InlineAction, SubmitButton } from "@/components/forms";
import { Field, Input, Select } from "@/components/ui";
import { placeHold, releaseHold, withdrawFromSection } from "@/server/registrar-actions";

export function HoldForm({ studentId }: { studentId: number }) {
  return (
    <ActionForm action={placeHold} resetOnSuccess className="space-y-3">
      {(e) => (
        <>
          <input type="hidden" name="studentId" value={studentId} />
          <Field label="Type" error={e.type}>
            <Select name="type" defaultValue="REGISTRATION">
              <option value="REGISTRATION">Registration hold</option>
              <option value="TRANSCRIPT">Transcript hold</option>
            </Select>
          </Field>
          <Field label="Reason" error={e.reason}>
            <Input name="reason" required placeholder="e.g. Unpaid tuition" />
          </Field>
          <SubmitButton variant="secondary">Place hold</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function ReleaseHold({ holdId }: { holdId: number }) {
  return <InlineAction action={releaseHold} label="Release" hidden={{ holdId }} confirm="Release this hold?" />;
}

export function WithdrawButton({ enrollmentId, code }: { enrollmentId: number; code: string }) {
  return (
    <InlineAction
      action={withdrawFromSection}
      label="Withdraw (W)"
      variant="ghost"
      hidden={{ enrollmentId }}
      confirm={`Withdraw the student from ${code}? They'll get a W, which doesn't count in their GPA.`}
    />
  );
}
