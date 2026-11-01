"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action";
import { buttonClass, Notice } from "./ui";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  className,
  confirm,
  name,
  value,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={cn(buttonClass(variant, size), className)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? (pendingText ?? "Saving…") : children}
    </button>
  );
}

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Form bound to a server action. Shows the action's message and passes
 * field errors down through a render prop.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
}: {
  action: Action;
  children: ReactNode | ((errors: Record<string, string>) => ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  const errors = state?.fieldErrors ?? {};
  return (
    <form ref={ref} action={formAction} className={className}>
      {state?.error && (
        <div className="mb-4">
          <Notice tone="danger">{state.error}</Notice>
        </div>
      )}
      {state?.ok && (
        <div className="mb-4">
          <Notice tone="ok">{state.ok}</Notice>
        </div>
      )}
      {typeof children === "function" ? children(errors) : children}
    </form>
  );
}

/** Small one-button form, e.g. delete or approve, with an optional confirm prompt. */
export function InlineAction({
  action,
  label,
  pendingText,
  confirm,
  variant = "secondary",
  hidden,
}: {
  action: Action;
  label: string;
  pendingText?: string;
  confirm?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  hidden?: Record<string, string | number>;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton size="sm" variant={variant} confirm={confirm} pendingText={pendingText}>
        {label}
      </SubmitButton>
      {state?.error && <span className="text-sm text-danger">{state.error}</span>}
    </form>
  );
}
