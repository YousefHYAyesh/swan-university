"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { isLockedOut, recordAttempt } from "@/lib/auth/rate-limit";
import { createSession, destroySession, getSession, homeFor } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

// Same message for unknown email and wrong password, so accounts can't be probed.
const BAD_LOGIN = "That email and password don't match an active account.";

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password, next } = parsed.data;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? null;

  if (await isLockedOut(email)) {
    return { error: "Too many failed attempts. Wait 15 minutes and try again." };
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  // Compare against a dummy hash when the user doesn't exist to keep timing similar.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
  if (!user || !ok || !user.isActive) {
    await recordAttempt(email, ip, false);
    return { error: BAD_LOGIN };
  }

  await recordAttempt(email, ip, true);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user);
  await audit(user.id, "login", "user", user.id);

  const home = homeFor(user.role);
  redirect(next && next.startsWith(home) ? next : home);
}

export async function logout() {
  const user = await getSession();
  if (user) await audit(user.id, "logout", "user", user.id);
  await destroySession();
  redirect("/login");
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    password: z.string().min(10, "Use at least 10 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });

export async function changePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/login");
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])) };
  }
  const user = await db.query.users.findFirst({ where: eq(users.id, session.id) });
  if (!user || !(await bcrypt.compare(parsed.data.current, user.passwordHash))) {
    return { error: "Check the highlighted fields.", fieldErrors: { current: "Current password is wrong" } };
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [updated] = await db
    .update(users)
    .set({ passwordHash, sessionVersion: user.sessionVersion + 1 })
    .where(eq(users.id, user.id))
    .returning();
  // Other devices are signed out; keep this one signed in.
  await createSession(updated);
  await audit(user.id, "password.change", "user", user.id);
  return { ok: "Password changed. Other devices have been signed out." };
}
