import "server-only";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendanceRecords } from "@/db/schema";

interface AttendanceStat {
  held: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  /** Share of sessions attended (present or late), ignoring excused absences. */
  rate: number | null;
}

export async function attendanceByEnrollment(enrollmentIds: number[]) {
  const out = new Map<number, AttendanceStat>();
  if (!enrollmentIds.length) return out;
  const rows = await db
    .select({
      enrollmentId: attendanceRecords.enrollmentId,
      status: attendanceRecords.status,
      n: sql<number>`count(*)::int`,
    })
    .from(attendanceRecords)
    .where(inArray(attendanceRecords.enrollmentId, enrollmentIds))
    .groupBy(attendanceRecords.enrollmentId, attendanceRecords.status);
  for (const r of rows) {
    const s = out.get(r.enrollmentId) ?? { held: 0, present: 0, late: 0, absent: 0, excused: 0, rate: null };
    s.held += r.n;
    s[r.status.toLowerCase() as "present" | "late" | "absent" | "excused"] += r.n;
    out.set(r.enrollmentId, s);
  }
  for (const s of out.values()) {
    const counted = s.held - s.excused;
    s.rate = counted ? Math.round(((s.present + s.late) / counted) * 100) : null;
  }
  return out;
}

/** Most universities fail students who miss more than 30% of classes. */
export const ATTENDANCE_MIN = 70;
