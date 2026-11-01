"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Select, Textarea } from "@/components/ui";
import { createRequest } from "@/server/student-actions";

export function RequestForm() {
  return (
    <ActionForm action={createRequest} resetOnSuccess className="space-y-4">
      {(e) => (
        <>
          <Field label="What do you need?" error={e.type}>
            <Select name="type" required defaultValue="">
              <option value="" disabled>
                Choose one
              </option>
              <option value="ENROLLMENT_CERTIFICATE">Enrollment certificate</option>
              <option value="TRANSCRIPT">Official transcript</option>
              <option value="GRADE_APPEAL">Grade appeal</option>
              <option value="OTHER">Something else</option>
            </Select>
          </Field>
          <Field label="Details" hint="Who it's for, which course, or anything the office should know." error={e.note}>
            <Textarea name="note" maxLength={1000} />
          </Field>
          <SubmitButton>Send request</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
