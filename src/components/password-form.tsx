"use client";

import { changePassword } from "@/server/auth-actions";
import { ActionForm, SubmitButton } from "./forms";
import { Field, Input } from "./ui";

export function PasswordForm() {
  return (
    <ActionForm action={changePassword} resetOnSuccess className="max-w-sm space-y-4">
      {(e) => (
        <>
          <Field label="Current password" error={e.current}>
            <Input name="current" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="New password" hint="At least 10 characters." error={e.password}>
            <Input name="password" type="password" autoComplete="new-password" required />
          </Field>
          <Field label="Repeat new password" error={e.confirm}>
            <Input name="confirm" type="password" autoComplete="new-password" required />
          </Field>
          <SubmitButton>Change password</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
