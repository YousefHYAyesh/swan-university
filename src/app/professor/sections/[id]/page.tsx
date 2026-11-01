import Link from "next/link";
import { eq } from "drizzle-orm";
import { Badge, Empty, Notice, PageHeader, Panel, Table, Td, Th, buttonClass } from "@/components/ui";
import { db } from "@/db";
import { attendanceSessions } from "@/db/schema";
import { checkWeights } from "@/domain/grading";
import { requireRole } from "@/lib/auth/session";
import { ASSESSMENT_TYPE, GRADE_STATUS } from "@/lib/labels";
import { cn, DAYS, formatDate, hhmm, termLabel, todayIso } from "@/lib/utils";
import { getScale } from "@/server/academic";
import { ATTENDANCE_MIN, attendanceByEnrollment } from "@/server/attendance";
import { getOwnedSection, isEditable } from "@/server/professor";
import { Gradebook } from "./gradebook";
import { AssessmentForm, AttendanceForm, DeleteAssessment, SubmitGradesForm } from "./section-forms";

const TABS = [
  ["gradebook", "Gradebook"],
  ["assessments", "Assessments"],
  ["attendance", "Attendance"],
  ["roster", "Roster"],
] as const;

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; date?: string }>;
}) {
  const user = await requireRole("PROFESSOR");
  const { id } = await params;
  const { tab = "gradebook", date } = await searchParams;
  const section = await getOwnedSection(Number(id), user.id);
  const editable = isEditable(section);
  const weights = checkWeights(section.assessments);
  const status = GRADE_STATUS[section.gradeStatus];
  const base = `/professor/sections/${section.id}`;

  return (
    <>
      <PageHeader
        back={{ href: "/professor", label: "My sections" }}
        title={`${section.course.code} ${section.course.title}`}
        description={
          <>
            Section {section.code} · {termLabel(section.term)} · {section.enrollments.length} students ·{" "}
            {section.meetings.map((m) => `${DAYS[m.dayOfWeek]} ${hhmm(m.startsAt)}–${hhmm(m.endsAt)}`).join(", ")}
            {section.room && ` · ${section.room}`}
          </>
        }
        actions={
          <>
            <Badge tone={status.tone}>{status.label}</Badge>
            <a href={`${base}/export`} className={buttonClass("secondary", "sm")}>
              Export CSV
            </a>
          </>
        }
      />

      {section.gradeStatus === "RETURNED" && section.reviewNote && (
        <div className="mb-4">
          <Notice tone="danger">
            <strong>Returned by the registrar:</strong> {section.reviewNote}
          </Notice>
        </div>
      )}
      {section.gradeStatus === "SUBMITTED" && (
        <div className="mb-4">
          <Notice tone="amber">Grades were submitted on {formatDate(section.gradesSubmittedAt)} and are waiting for registrar approval.</Notice>
        </div>
      )}

      <nav className="mb-4 flex gap-1 border-b border-line" aria-label="Section views">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`${base}?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              tab === key ? "border-lake font-medium text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "gradebook" && <GradebookTab section={section} editable={editable} weights={weights} />}
      {tab === "assessments" && <AssessmentsTab section={section} editable={editable} weights={weights} />}
      {tab === "attendance" && <AttendanceTab section={section} date={date} />}
      {tab === "roster" && <RosterTab section={section} />}
    </>
  );
}

type S = Awaited<ReturnType<typeof getOwnedSection>>;

async function GradebookTab({ section, editable, weights }: { section: S; editable: boolean; weights: ReturnType<typeof checkWeights> }) {
  const scale = await getScale();
  if (!section.assessments.length) {
    return (
      <Panel>
        <Empty title="No assessments yet">
          Set up the assessments and their weights first.{" "}
          <Link className="text-lake underline" href={`/professor/sections/${section.id}?tab=assessments`}>
            Add assessments
          </Link>
        </Empty>
      </Panel>
    );
  }
  const final = section.assessments.find((a) => a.type === "FINAL");
  const missingFinals = final
    ? section.enrollments.filter((e) => !e.scores.some((s) => s.assessmentId === final.id && s.score != null)).length
    : 0;
  return (
    <div className="space-y-6">
      {weights && (
        <Notice tone="amber">
          Assessment weights add up to {weights.kind === "not-100" ? weights.total : 0}%. Fix them on the Assessments tab before submitting
          grades.
        </Notice>
      )}
      <Panel flush>
        {section.enrollments.length === 0 ? (
          <Empty title="No students registered yet" />
        ) : (
          <Gradebook
            sectionId={section.id}
            editable={editable}
            scale={scale}
            assessments={section.assessments}
            rows={section.enrollments.map((e) => ({
              enrollmentId: e.id,
              name: `${e.student.user.lastName}, ${e.student.user.firstName}`,
              studentNo: e.student.studentNo,
              scores: Object.fromEntries(e.scores.map((s) => [s.assessmentId, s.score])),
            }))}
          />
        )}
      </Panel>
      {editable && !weights && section.enrollments.length > 0 && (
        <Panel title="Submit final grades">
          <p className="mb-4 max-w-[70ch] text-sm text-ink-soft">
            When every score is in, submit the section. Letter grades are calculated from the weighted percentages on the AA–FF scale, and the
            registrar office approves them before students see a final grade.
          </p>
          <SubmitGradesForm sectionId={section.id} missingFinals={missingFinals} />
        </Panel>
      )}
    </div>
  );
}

function AssessmentsTab({ section, editable, weights }: { section: S; editable: boolean; weights: ReturnType<typeof checkWeights> }) {
  const total = section.assessments.reduce((s, a) => s + a.weight, 0);
  return (
    <div className="space-y-6">
      <Panel
        title="Assessments"
        actions={
          <span className={cn("text-sm", weights ? "text-amber" : "text-ok")}>
            Total weight {Math.round(total * 100) / 100}% {weights ? "· needs to be 100%" : "✓"}
          </span>
        }
        flush
      >
        {section.assessments.length === 0 ? (
          <Empty title="No assessments yet" />
        ) : editable ? (
          <div className="divide-y divide-line">
            {section.assessments.map((a) => (
              <div key={a.id} className="flex flex-wrap items-end gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <AssessmentForm sectionId={section.id} assessment={a} />
                </div>
                <DeleteAssessment sectionId={section.id} assessment={a} />
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th className="text-right">Weight</Th>
                <Th className="text-right">Out of</Th>
                <Th>Due</Th>
              </tr>
            </thead>
            <tbody>
              {section.assessments.map((a) => (
                <tr key={a.id}>
                  <Td>{a.name}</Td>
                  <Td>{ASSESSMENT_TYPE[a.type]}</Td>
                  <Td className="text-right">{a.weight}%</Td>
                  <Td className="text-right">{a.maxScore}</Td>
                  <Td>{formatDate(a.dueOn)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
      {editable && (
        <Panel title="Add an assessment">
          <AssessmentForm sectionId={section.id} />
        </Panel>
      )}
    </div>
  );
}

async function AttendanceTab({ section, date }: { section: S; date?: string }) {
  const sessions = await db.query.attendanceSessions.findMany({
    where: eq(attendanceSessions.sectionId, section.id),
    with: { records: true },
    orderBy: (t, { desc }) => [desc(t.heldOn)],
  });
  const stats = await attendanceByEnrollment(section.enrollments.map((e) => e.id));
  const selectedDate = date ?? (todayIso() <= section.term.endsOn ? todayIso() : section.term.endsOn);
  const selected = sessions.find((s) => s.heldOn === selectedDate);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <Panel title={selected ? `Attendance for ${formatDate(selectedDate)}` : "Take attendance"}>
        {section.enrollments.length === 0 ? (
          <Empty title="No students registered yet" />
        ) : (
          <AttendanceForm
            sectionId={section.id}
            date={selectedDate}
            topic={selected?.topic ?? ""}
            roster={section.enrollments.map((e) => ({
              enrollmentId: e.id,
              name: `${e.student.user.lastName}, ${e.student.user.firstName}`,
              studentNo: e.student.studentNo,
              status: selected?.records.find((r) => r.enrollmentId === e.id)?.status ?? "PRESENT",
            }))}
          />
        )}
      </Panel>
      <div className="space-y-6">
        <Panel title="Past sessions" flush>
          {sessions.length === 0 ? (
            <Empty title="No sessions recorded" />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/professor/sections/${section.id}?tab=attendance&date=${s.heldOn}`}
                    className={cn("flex justify-between px-5 py-2.5 hover:bg-paper", s.heldOn === selectedDate && "bg-lake-wash")}
                  >
                    <span>{formatDate(s.heldOn)}</span>
                    <span className="text-muted">{s.topic}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={`Below ${ATTENDANCE_MIN}%`} flush>
          {(() => {
            const low = section.enrollments.filter((e) => (stats.get(e.id)?.rate ?? 100) < ATTENDANCE_MIN);
            return low.length === 0 ? (
              <Empty title="Everyone is above the limit" />
            ) : (
              <ul className="divide-y divide-line text-sm">
                {low.map((e) => (
                  <li key={e.id} className="flex justify-between px-5 py-2.5">
                    <span>
                      {e.student.user.firstName} {e.student.user.lastName}
                    </span>
                    <span className="font-medium text-danger">{stats.get(e.id)?.rate}%</span>
                  </li>
                ))}
              </ul>
            );
          })()}
        </Panel>
      </div>
    </div>
  );
}

async function RosterTab({ section }: { section: S }) {
  const stats = await attendanceByEnrollment(section.enrollments.map((e) => e.id));
  return (
    <Panel flush>
      {section.enrollments.length === 0 ? (
        <Empty title="No students registered yet" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Student</Th>
              <Th>Student no.</Th>
              <Th>Program</Th>
              <Th>Email</Th>
              <Th className="text-right">Attendance</Th>
            </tr>
          </thead>
          <tbody>
            {section.enrollments.map((e) => {
              const rate = stats.get(e.id)?.rate;
              return (
                <tr key={e.id}>
                  <Td className="font-medium">
                    {e.student.user.lastName}, {e.student.user.firstName}
                  </Td>
                  <Td>{e.student.studentNo}</Td>
                  <Td className="text-ink-soft">{e.student.program.name}</Td>
                  <Td>
                    <a href={`mailto:${e.student.user.email}`} className="text-lake hover:underline">
                      {e.student.user.email}
                    </a>
                  </Td>
                  <Td className={cn("text-right", rate != null && rate < ATTENDANCE_MIN && "font-medium text-danger")}>
                    {rate == null ? "—" : `${rate}%`}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}
