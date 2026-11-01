"use client";

import { useActionState, useRef } from "react";
import { login } from "@/server/auth-actions";
import { SubmitButton } from "@/components/forms";
import { Field, Input, Notice } from "@/components/ui";

export function LoginForm({
  next,
  demoAccounts,
}: {
  next?: string;
  demoAccounts: { role: string; email: string }[];
}) {
  const [state, action] = useActionState(login, null);
  const email = useRef<HTMLInputElement>(null);
  const password = useRef<HTMLInputElement>(null);

  return (
    <>
      <form action={action} className="mt-8 space-y-4">
        {state?.error && <Notice tone="danger">{state.error}</Notice>}
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email">
          <Input ref={email} name="email" type="email" autoComplete="username" required autoFocus />
        </Field>
        <Field label="Password">
          <Input ref={password} name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton className="w-full" pendingText="Signing in…">
          Sign in
        </SubmitButton>
      </form>

      {demoAccounts.length > 0 && (
        <div className="mt-10 border-t border-line pt-6">
          <p className="text-sm text-ink-soft">
            Demo accounts use the password <code className="rounded bg-lake-wash px-1 text-lake-deep">swan-demo</code>. Pick one to fill the form:
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {demoAccounts.map((a) => (
              <button
                key={a.email}
                type="button"
                className="rounded-[var(--radius-control)] border border-line px-3 py-2 text-left text-sm hover:border-lake"
                onClick={() => {
                  if (email.current) email.current.value = a.email;
                  if (password.current) password.current.value = "swan-demo";
                }}
              >
                <span className="block font-medium">{a.role}</span>
                <span className="block truncate text-muted">{a.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
