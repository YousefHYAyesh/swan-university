"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { formObject, invalid, type ActionState } from "@/lib/action";

const schema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(150),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  body: z.string().trim().min(10, "Write a little more").max(3000),
  website: z.string().max(0).optional(), // honeypot: real people leave it empty
});

export async function sendContactMessage(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(formObject(formData));
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { ok: "Thanks, we'll get back to you." };
    return invalid(parsed.error);
  }
  const since = new Date(Date.now() - 86_400_000);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(contactMessages)
    .where(and(eq(contactMessages.email, parsed.data.email), gt(contactMessages.createdAt, since)));
  if (n >= 3) return { error: "You've already sent a few messages today. We'll reply to those first." };
  const { name, email, body } = parsed.data;
  await db.insert(contactMessages).values({ name, email, body });
  return { ok: "Thanks, your message reached the admissions office. We usually reply within two working days." };
}
