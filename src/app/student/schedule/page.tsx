import { Empty, PageHeader, Panel } from "@/components/ui";
import { WeekGrid } from "@/components/week-grid";
import { requireRole } from "@/lib/auth/session";
import { termLabel } from "@/lib/utils";
import { getCurrentTerm } from "@/server/academic";
import { getEnrollmentHistory } from "@/server/records";

export const metadata = { title: "Weekly schedule" };

export default async function SchedulePage() {
  const user = await requireRole("STUDENT");
  const [term, history] = await Promise.all([getCurrentTerm(), getEnrollmentHistory(user.id)]);
  const current = history.filter((e) => e.section.termId === term?.id && e.status === "REGISTERED");
  const items = current.flatMap((e, i) =>
    e.section.meetings.map((m) => ({
      key: m.id,
      dayOfWeek: m.dayOfWeek,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      title: e.section.course.code,
      subtitle: `${e.section.room ?? ""} · ${e.section.course.title}`,
      tone: i,
    })),
  );
  return (
    <>
      <PageHeader title="Weekly schedule" description={term ? termLabel(term) : undefined} />
      <Panel>{items.length ? <WeekGrid items={items} /> : <Empty title="No classes this term" />}</Panel>
    </>
  );
}
