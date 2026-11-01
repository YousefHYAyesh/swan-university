"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import type { ActionState } from "@/lib/action";
import { getSession } from "@/lib/auth/session";

export async function openNotification(formData: FormData) {
  const user = await getSession();
  if (!user) redirect("/login");
  const id = Number(formData.get("id"));
  const [n] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
    .returning();
  revalidatePath("/", "layout");
  // Only follow internal links.
  if (n?.link?.startsWith("/")) redirect(n.link);
}

export async function markAllRead() {
  const user = await getSession();
  if (!user) redirect("/login");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  revalidatePath("/", "layout");
}

export async function setEmailPreference(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSession();
  if (!user) redirect("/login");
  const on = formData.get("email") === "on";
  await db.update(users).set({ emailNotifications: on }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return { ok: on ? "You'll get notifications by email too." : "Email notifications turned off." };
}
