import Link from "next/link";
import { AnnouncementList } from "@/components/announcements";
import { Badge, Empty, PageHeader, Panel, Table, Td, Th } from "@/components/ui";
import { checkWeights } from "@/domain/grading";
import { requireRole } from "@/lib/auth/session";
import { GRADE_STATUS } from "@/lib/labels";
import { DAYS, formatDate, hhmm, termKey, termLabel } from "@/lib/utils";
import { getCurrentTerm } from "@/server/academic";
import { announcementsFor } from "@/server/announcements";
import { sectionsTaughtBy } from "@/server/professor";

export const metadata = { title: "My sections" };

export default async function ProfessorHome() {
  const user = await requireRole("PROFESSOR");
  const [all, term] = await Promise.all([sectionsTaughtBy(user.id), getCurrentTerm()]);
  const current = all.filter((s) => s.termId === term?.id).sort((a, b) => a.course.code.localeCompare(b.course.code));
  const past = all.filter((s) => s.termId !== term?.id).sort((a, b) => termKey(b.term) - termKey(a.term));
  const news = await announcementsFor("PROFESSOR", []);

  const todo = current.flatMap((s) => {
    const items: string[] = [];
    const w = checkWeights(s.assessments);
    if (w) items.push(w.kind === "empty" ? "add assessments" : `weights total ${w.total}%`);
    if (s.gradeStatus === "RETURNED") items.push("grades returned by the registrar");
    return items.length ? [{ s, items }] : [];
  });

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.firstName}`}
        description={term ? `${termLabel(term)} · final grades due ${formatDate(term.gradeDeadline)}` : undefined}
      />

      {todo.length > 0 && (
        <Panel title="Needs your attention" className="mb-6" flush>
          <ul className="divide-y divide-line text-sm">
            {todo.map(({ s, items }) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <Link href={`/professor/sections/${s.id}`} className="font-medium hover:text-lake">
                  {s.course.code} · section {s.code}
                </Link>
                <span className="text-ink-soft">{items.join(", ")}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Panel title="This term" flush>
          {current.length === 0 ? (
            <Empty title="You aren't teaching any sections this term" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Course</Th>
                  <Th>Schedule</Th>
                  <Th className="text-right">Students</Th>
                  <Th>Grades</Th>
                </tr>
              </thead>
              <tbody>
                {current.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <Link href={`/professor/sections/${s.id}`} className="font-medium hover:text-lake">
                        {s.course.code} {s.course.title}
                      </Link>
                      <div className="text-muted">Section {s.code}</div>
                    </Td>
                    <Td className="whitespace-nowrap text-ink-soft">
                      {s.meetings.map((m) => (
                        <div key={m.id}>
                          {DAYS[m.dayOfWeek]} {hhmm(m.startsAt)}–{hhmm(m.endsAt)}
                        </div>
                      ))}
                      <div className="text-muted">{s.room}</div>
                    </Td>
                    <Td className="text-right">
                      {s.enrollments.length}
                      <span className="text-muted"> / {s.capacity}</span>
                    </Td>
                    <Td>
                      <Badge tone={GRADE_STATUS[s.gradeStatus].tone}>{GRADE_STATUS[s.gradeStatus].label}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        <Panel title="Announcements" flush>
          <AnnouncementList items={news} />
        </Panel>
      </div>

      {past.length > 0 && (
        <Panel title="Past sections" className="mt-6" flush>
          <Table>
            <tbody>
              {past.map((s) => (
                <tr key={s.id}>
                  <Td className="w-44 text-ink-soft">{termLabel(s.term)}</Td>
                  <Td>
                    <Link href={`/professor/sections/${s.id}`} className="hover:text-lake">
                      {s.course.code} {s.course.title} · {s.code}
                    </Link>
                  </Td>
                  <Td className="text-right text-ink-soft">{s.enrollments.length} students</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      )}
    </>
  );
}
