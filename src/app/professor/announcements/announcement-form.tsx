"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { postSectionAnnouncement } from "@/server/professor-actions";

export function SectionAnnouncementForm({ sections }: { sections: { id: number; label: string }[] }) {
  return (
    <ActionForm action={postSectionAnnouncement} resetOnSuccess className="space-y-4">
      {(e) => (
        <>
          <Field label="Section" error={e.sectionId}>
            <Select name="sectionId" required defaultValue="">
              <option value="" disabled>
                Choose a section
              </option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title" error={e.title}>
            <Input name="title" required maxLength={150} />
          </Field>
          <Field label="Message" error={e.body}>
            <Textarea name="body" required className="min-h-32" />
          </Field>
          <SubmitButton>Post announcement</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
