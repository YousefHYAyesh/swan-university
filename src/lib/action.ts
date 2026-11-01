import { z } from "zod";

export type ActionState = {
  ok?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

/** Turns a zod error into "first message per field". */
function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function invalid(error: z.ZodError): ActionState {
  return { error: "Check the highlighted fields.", fieldErrors: fieldErrors(error) };
}

/** FormData to a plain object; empty strings become undefined. */
export function formObject(fd: FormData) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    if (k in out) {
      const prev = out[k];
      out[k] = Array.isArray(prev) ? [...prev, v] : [prev, v];
    } else out[k] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

/** Postgres unique-violation check for friendlier messages. */
export function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}
