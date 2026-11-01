import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { programs, students, users } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const user = await getSession();
  if (!user || (user.role !== "REGISTRAR" && user.role !== "ADMIN")) return new Response("Not allowed", { status: 403 });
  const rows = await db
    .select({
      studentNo: students.studentNo,
      lastName: users.lastName,
      firstName: users.firstName,
      email: users.email,
      program: programs.name,
      entryYear: students.entryYear,
      status: students.status,
    })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(programs, eq(programs.id, students.programId))
    .orderBy(asc(users.lastName));
  const csv = toCsv([
    ["Student no", "Last name", "First name", "Email", "Program", "Entry year", "Status"],
    ...rows.map((r) => [r.studentNo, r.lastName, r.firstName, r.email, r.program, r.entryYear, r.status]),
  ]);
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="students.csv"' },
  });
}
