import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { sendEmail } from "@/lib/email";

type Kind = (typeof notifications.$inferInsert)["kind"];

/**
 * Creates in-app notifications and, for users who haven't turned it off,
 * sends the same message by email. Email failures never block the caller.
 */
export async function notify(userIds: number[], n: { title: string; body?: string; link?: string; kind: Kind }) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  await db.insert(notifications).values(ids.map((userId) => ({ userId, ...n })));

  const recipients = await db
    .select({ email: users.email, firstName: users.firstName })
    .from(users)
    .where(and(inArray(users.id, ids), eq(users.emailNotifications, true), eq(users.isActive, true)));
  const base = process.env.APP_URL ?? "http://localhost:3000";
  await Promise.allSettled(
    recipients.map((r) =>
      sendEmail({
        to: r.email,
        subject: n.title,
        text: `Hi ${r.firstName},\n\n${n.title}${n.body ? `\n\n${n.body}` : ""}${n.link ? `\n\nOpen: ${base}${n.link}` : ""}\n\nSwan University`,
      }),
    ),
  );
}

export async function unreadCount(userId: number) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row.n;
}

export async function recentNotifications(userId: number, limit = 30) {
  return db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: [desc(notifications.createdAt)],
    limit,
  });
}
