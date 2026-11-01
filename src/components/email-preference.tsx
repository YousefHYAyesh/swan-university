"use client";

import { setEmailPreference } from "@/server/notification-actions";
import { ActionForm, SubmitButton } from "./forms";

export function EmailPreference({ enabled }: { enabled: boolean }) {
  return (
    <ActionForm action={setEmailPreference} className="space-y-3">
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="email" defaultChecked={enabled} className="mt-0.5 h-4 w-4 accent-lake" />
        <span>
          Also email me when grades are posted, requests are answered or something needs my attention.
          <span className="block text-muted">Notifications always appear under the bell either way.</span>
        </span>
      </label>
      <SubmitButton variant="secondary">Save preference</SubmitButton>
    </ActionForm>
  );
}
