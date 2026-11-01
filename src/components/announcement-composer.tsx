"use client";

import { deleteAnnouncement, postAnnouncement } from "@/server/registrar-actions";
import { ActionForm, InlineAction, SubmitButton } from "./forms";
import { Field, Input, Select, Textarea } from "./ui";

export function AnnouncementComposer() {
  return (
    <ActionForm action={postAnnouncement} resetOnSuccess className="space-y-4">
      {(e) => (
        <>
          <Field label="Audience" error={e.audience}>
            <Select name="audience" defaultValue="STUDENTS">
              <option value="STUDENTS">All students</option>
              <option value="STAFF">All staff</option>
              <option value="ALL">Everyone</option>
            </Select>
          </Field>
          <Field label="Title" error={e.title}>
            <Input name="title" required maxLength={150} />
          </Field>
          <Field label="Message" error={e.body}>
            <Textarea name="body" required className="min-h-32" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="pinned" className="h-4 w-4 accent-lake" /> Pin to the top
          </label>
          <SubmitButton>Post announcement</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function DeleteAnnouncement({ id }: { id: number }) {
  return <InlineAction action={deleteAnnouncement} label="Delete" variant="ghost" hidden={{ announcementId: id }} confirm="Delete this announcement?" />;
}
