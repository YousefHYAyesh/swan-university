import Link from "next/link";
import { InlineAction } from "@/components/forms";
import { Badge, Empty, Input, Notice, PageHeader, Panel, Select, Table, Td, Th, buttonClass } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { DAYS, formatDate, hhmm, termLabel } from "@/lib/utils";
import { registrationView } from "@/server/registration";
import { drop, register } from "@/server/registration-actions";

export const metadata = { title: "Course registration" };

export default async function RegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string; eligible?: string }>;
}) {
  const user = await requireRole("STUDENT");
  const { q = "", dept = "", eligible } = await searchParams;
  const view = await registrationView(user.id);
  if (!view) return <Empty title="No term is open for registration" />;

  const { term, ctx, current, offered } = view;
  const open = ctx.today >= ctx.window.opensOn && ctx.today <= ctx.window.closesOn;
  const credits = current.reduce((s, c) => s + c.credits, 0);
  const departments = [...new Map(offered.map((o) => [o.course.department.code, o.course.department.name]))];
  const needle = q.trim().toLowerCase();
  const list = offered.filter(
    (o) =>
      (!needle || `${o.course.code} ${o.course.title}`.toLowerCase().includes(needle)) &&
      (!dept || o.course.department.code === dept) &&
      (!eligible || o.registered || o.problems.length === 0),
  );
  const mine = offered.filter((o) => o.registered);

  return (
    <>
      <PageHeader
        title="Course registration"
        description={`${termLabel(term)} · add/drop ${open ? "is open until" : "closed on"} ${formatDate(term.registrationClosesOn)}`}
      />

      {!open && (
        <div className="mb-6">
          <Notice tone="amber">
            Add/drop is closed. To withdraw from a course now, send a request to the registrar office.
          </Notice>
        </div>
      )}
      {ctx.hasRegistrationHold && (
        <div className="mb-6">
          <Notice tone="danger">You have a registration hold. The registrar office has to release it before you can add courses.</Notice>
        </div>
      )}

      <Panel
        className="mb-6"
        title="Your courses this term"
        actions={
          <span className={credits > ctx.maxCredits ? "text-sm text-danger" : "text-sm text-ink-soft"}>
            {credits} of {ctx.maxCredits} credits
          </span>
        }
        flush
      >
        {mine.length === 0 ? (
          <Empty title="Nothing added yet">Pick sections from the list below.</Empty>
        ) : (
          <Table>
            <tbody>
              {mine.map((s) => (
                <tr key={s.id}>
                  <Td className="w-28 font-medium">{s.course.code}</Td>
                  <Td>
                    {s.course.title} <span className="text-muted">· section {s.code}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-ink-soft">
                    {s.meetings.map((m) => `${DAYS[m.dayOfWeek]} ${hhmm(m.startsAt)}–${hhmm(m.endsAt)}`).join(", ")}
                  </Td>
                  <Td className="text-right">{s.course.credits} cr</Td>
                  <Td className="w-24 text-right">
                    {open && (
                      <InlineAction
                        action={drop}
                        label="Drop"
                        pendingText="Dropping…"
                        hidden={{ sectionId: s.id }}
                        confirm={`Drop ${s.course.code}? Your seat will go to someone else.`}
                      />
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel title="Sections offered" flush>
        <form className="flex flex-wrap items-end gap-3 border-b border-line px-5 py-4">
          <Input name="q" defaultValue={q} placeholder="Search by code or title" className="max-w-xs" />
          <Select name="dept" defaultValue={dept} className="max-w-xs">
            <option value="">All departments</option>
            {departments.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>
          <label className="flex h-10 items-center gap-2 text-sm">
            <input type="checkbox" name="eligible" value="1" defaultChecked={!!eligible} className="h-4 w-4 accent-lake" />
            Only sections I can take
          </label>
          <button className={buttonClass("secondary")}>Filter</button>
          {(q || dept || eligible) && (
            <Link href="/student/registration" className="text-sm text-lake hover:underline">
              Clear
            </Link>
          )}
        </form>
        {list.length === 0 ? (
          <Empty title="No sections match">Try a different search or clear the filters.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Course</Th>
                <Th>Instructor</Th>
                <Th>Schedule</Th>
                <Th className="text-right">Seats</Th>
                <Th className="w-[30%]">Status</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const seatsLeft = s.capacity - s.forCheck.enrolledCount;
                return (
                  <tr key={s.id}>
                    <Td>
                      <div className="font-medium">
                        {s.course.code} <span className="font-normal text-muted">· {s.code}</span>
                      </div>
                      <div>{s.course.title}</div>
                      <div className="text-xs text-muted">
                        {s.course.credits} credits · {s.course.ects} ECTS
                        {s.forCheck.prerequisiteCodes.length > 0 && ` · requires ${s.forCheck.prerequisiteCodes.join(", ")}`}
                      </div>
                    </Td>
                    <Td className="text-ink-soft">
                      {s.instructor ? `${s.instructor.user.firstName} ${s.instructor.user.lastName}` : "TBA"}
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
                      <span className={seatsLeft <= 0 ? "text-danger" : seatsLeft <= 3 ? "text-amber" : ""}>
                        {seatsLeft <= 0 ? "Full" : `${seatsLeft} left`}
                      </span>
                      <div className="text-xs text-muted">of {s.capacity}</div>
                    </Td>
                    <Td>
                      {s.registered ? (
                        <Badge tone="ok">Registered</Badge>
                      ) : s.problems.length ? (
                        <ul className="space-y-0.5 text-sm text-ink-soft">
                          {s.problems.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      ) : (
                        <InlineAction action={register} label="Register" pendingText="Registering…" variant="primary" hidden={{ sectionId: s.id }} />
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
