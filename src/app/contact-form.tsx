"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input, Textarea } from "@/components/ui";
import { sendContactMessage } from "@/server/public-actions";

export function ContactForm() {
  return (
    <ActionForm action={sendContactMessage} resetOnSuccess className="space-y-4">
      {(e) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={e.name}>
              <Input name="name" required autoComplete="name" />
            </Field>
            <Field label="Email" error={e.email}>
              <Input name="email" type="email" required autoComplete="email" />
            </Field>
          </div>
          <Field label="Message" error={e.body}>
            <Textarea name="body" required className="min-h-32" />
          </Field>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <SubmitButton>Send message</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
