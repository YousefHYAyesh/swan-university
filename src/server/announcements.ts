import "server-only";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { announcements, users, sections, courses } from "@/db/schema";
import type { Role } from "@/db/schema";

/** Announcements a user should see: everyone, their audience, and their sections. */
export async function announcementsFor(role: Role, sectionIds: number[], limit = 6) {
  const audience = role === "STUDENT" ? "STUDENTS" : "STAFF";
  const conditions = [eq(announcements.audience, "ALL"), eq(announcements.audience, audience)];
  if (sectionIds.length) {
    conditions.push(and(eq(announcements.audience, "SECTION"), inArray(announcements.sectionId, sectionIds))!);
  }
  return db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      pinned: announcements.pinned,
      audience: announcements.audience,
      createdAt: announcements.createdAt,
      authorFirst: users.firstName,
      authorLast: users.lastName,
      courseCode: courses.code,
    })
    .from(announcements)
    .innerJoin(users, eq(users.id, announcements.authorId))
    .leftJoin(sections, eq(sections.id, announcements.sectionId))
    .leftJoin(courses, eq(courses.id, sections.courseId))
    .where(or(...conditions))
    .orderBy(desc(announcements.pinned), desc(announcements.createdAt))
    .limit(limit);
}

export type AnnouncementItem = Awaited<ReturnType<typeof announcementsFor>>[number];
