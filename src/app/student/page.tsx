import Link from "next/link";
import { AnnouncementList } from "@/components/announcements";
import { Badge, Empty, GradeChip, Notice, PageHeader, Panel, Stat, Table, Td, Th } from "@/components/ui";
import { letterFor } from "@/domain/grading";
import { requireRole } from "@/lib/auth/session";
import { DAYS, hhmm, termLabel } from "@/lib/utils";
import { getCurrentTerm, getScale } from "@/server/academic";
import { announcementsFor } from "@/server/announcements";
import { ATTENDANCE_MIN, attendanceByEnrollment } from "@/server/attendance";
import { STANDING_LABEL, academicSummary, activeHolds, getStudent } from "@/server/records";

export const metadata = { title: "Overview" };

export default async function StudentHome() {
  const user = await requireRole("STUDENT");
  const [student, summary, term, holds, scale] = await Promise.all([
    getStudent(user.id),
    academicSummary(user.id),
    getCurrentTerm(),
    activeHolds(user.id),
    getScale(),
  ]);
  if (!student) throw new Error("Student record missing");

  const current = summary.terms.find((t) => t.term.id === term?.id);
  const rows = current?.rows.filter((r) => r.status === "REGISTERED") ?? [];
  const [attendance, news] = await Promise.all([
    attendanceByEnrollment(rows.map((r) => r.id)),
    announcementsFor("STUDENT", rows.map((r) => r.sectionId)),
  ]);
  const currentCredits = rows.reduce((s, r) => s + r.section.course.credits, 0);
  const standing = STANDING_LABEL[summary.standing];
  const lowAttendance = rows.filter((r) => {
    const a = attendance.get(r.id);
    return a?.rate != null && a.rate < ATTENDANCE_MIN;
  });

  return (
    <>
      <PageHeader
        title={`Hello, ${user.firstName}`}
        description={`${student.program.degree} ${student.program.name} · student no. ${student.studentNo}`}
      />

      {holds.length > 0 && (
        <div className="mb-6">
          <Notice tone="danger">
            {holds.map((h) => (
              <div key={h.id}>
                <strong>{h.type === "REGISTRATION" ? "Registration hold" : "Transcript hold"}:</strong> {h.reason}. Contact the registrar
                office to have it released.
              </div>
            ))}
          </Notice>
        </div>
      )}
      {lowAttendance.length > 0 && (
        <div className="mb-6">
          <Notice tone="amber">
            Your attendance in {lowAttendance.map((r) => r.section.course.code).join(", ")} is below {ATTENDANCE_MIN}%. Falling further
            can mean an NA grade.
          </Notice>
        </div>
      )}

      <Panel className="mb-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat label="Cumulative GPA" value={summary.cgpa?.toFixed(2) ?? "—"} note="out of 4.00" />
          <Stat label="Standing" value={<Badge tone={standing.tone}>{standing.label}</Badge>} />
          <Stat
            label="Credits earned"
            value={summary.earnedCredits}
            note={`${summary.attemptedCredits} attempted`}
          />
          <Stat label="This term" value={`${currentCredits} credits`} note={`${rows.length} courses`} />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel
          title={term ? `Courses this term · ${termLabel(term)}` : "Courses this term"}
          actions={
            <Link href="/student/registration" className="text-sm text-lake hover:underline">
              Add or drop courses
            </Link>
          }
          flush
        >
          {rows.length === 0 ? (
            <Empty title="You aren't registered for any courses yet">
              Registration is open until {term?.registrationClosesOn}. <Link className="text-lake underline" href="/student/registration">Choose your courses</Link>.
            </Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Course</Th>
                  <Th>Schedule</Th>
                  <Th className="text-right">So far</Th>
                  <Th className="text-right">Attendance</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const a = attendance.get(r.id);
                  return (
                    <tr key={r.id}>
                      <Td>
                        <Link href={`/student/grades#${r.section.course.code}`} className="font-medium hover:text-lake">
                          {r.section.course.code} {r.section.course.title}
                        </Link>
                        <div className="text-muted">
                          {r.section.instructor ? `${r.section.instructor.title} ${r.section.instructor.user.firstName} ${r.section.instructor.user.lastName}` : "Instructor TBA"}
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-ink-soft">
                        {r.section.meetings.map((m) => (
                          <div key={m.id}>
                            {DAYS[m.dayOfWeek]} {hhmm(m.startsAt)}–{hhmm(m.endsAt)}
                          </div>
                        ))}
                        <div className="text-muted">{r.section.room}</div>
                      </Td>
                      <Td className="text-right">
                        {r.runningPercent == null ? (
                          <span className="text-muted">No grades yet</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span>{r.runningPercent.toFixed(1)}%</span>
                            <GradeChip size="sm" letter={letterFor(r.runningPercent, scale)} />
                          </div>
                        )}
                        {r.runningPercent != null && <div className="text-xs text-muted">{r.weightCovered}% of the course graded</div>}
                      </Td>
                      <Td className="text-right">
                        {a?.rate == null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span className={a.rate < ATTENDANCE_MIN ? "font-medium text-danger" : ""}>{a.rate}%</span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel title="Announcements" flush>
          <AnnouncementList items={news} />
        </Panel>
      </div>

      {student.advisor && (
        <p className="mt-6 text-sm text-ink-soft">
          Your advisor is {student.advisor.title} {student.advisor.user.firstName} {student.advisor.user.lastName} ({student.advisor.user.email}
          {student.advisor.office ? `, office ${student.advisor.office}` : ""}).
        </p>
      )}
    </>
  );
}
