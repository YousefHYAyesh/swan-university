"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input, Textarea } from "@/components/ui";
import { updateContact } from "@/server/student-actions";

export function ContactForm({ phone, address }: { phone: string | null; address: string | null }) {
  return (
    <ActionForm action={updateContact} className="max-w-md space-y-4">
      {(e) => (
        <>
          <Field label="Phone" error={e.phone}>
            <Input name="phone" defaultValue={phone ?? ""} />
          </Field>
          <Field label="Address" error={e.address}>
            <Textarea name="address" defaultValue={address ?? ""} className="min-h-20" />
          </Field>
          <SubmitButton>Save contact details</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
