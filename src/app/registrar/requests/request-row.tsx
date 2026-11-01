"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Select, Textarea } from "@/components/ui";
import { updateRequest } from "@/server/registrar-actions";

export function RequestReply({ id, status, response }: { id: number; status: string; response: string | null }) {
  return (
    <ActionForm action={updateRequest} className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-start">
      {(e) => (
        <>
          <input type="hidden" name="requestId" value={id} />
          <Select name="status" defaultValue={status} aria-label="Status">
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </Select>
          <div>
            <Textarea name="response" defaultValue={response ?? ""} placeholder="Reply to the student" className="min-h-10" aria-label="Reply" />
            {e.response && <p className="mt-1 text-sm text-danger">{e.response}</p>}
          </div>
          <SubmitButton variant="secondary">Update</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
